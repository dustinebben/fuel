// Every derived calculation in this app lives here as a pure function. No maths in a
// component, ever. See CLAUDE.md "The correctness rule that matters most": consumption
// is only measurable between two *complete* fill-ups, and a plausible-looking wrong
// number is worse than an obviously missing one — so every function here returns
// `null` rather than guessing when its inputs don't support a real answer.

import type { EnrichedFillUpRow, FillUpRow, FuelPriceRow, PriceZone } from './database.types'

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// ---------------------------------------------------------------------------
// Enrichment — mirrors supabase/migrations/0003_enriched_view.sql exactly, so the
// same rules apply whether a row came from Postgres or was computed locally while
// offline (see the Dexie write queue in lib/offlineQueue.ts).
// ---------------------------------------------------------------------------

export function enrichFillUps(fillUps: FillUpRow[]): EnrichedFillUpRow[] {
  const byVehicle = new Map<string, FillUpRow[]>()
  for (const f of fillUps) {
    const list = byVehicle.get(f.vehicle_id)
    if (list) list.push(f)
    else byVehicle.set(f.vehicle_id, [f])
  }

  const result: EnrichedFillUpRow[] = []
  for (const list of byVehicle.values()) {
    const ordered = [...list].sort((a, b) => a.odometer_km - b.odometer_km)
    ordered.forEach((row, i) => {
      result.push(enrichOne(row, i > 0 ? ordered[i - 1] : null))
    })
  }
  return result
}

function enrichOne(o: FillUpRow, prev: FillUpRow | null): EnrichedFillUpRow {
  const prevOdometerKm = prev?.odometer_km ?? null
  const prevIsFull = prev?.is_full_tank ?? null
  const prevRangeEstimate = prev?.range_estimate_km ?? null
  const prevFilledAt = prev?.filled_at ?? null

  const distanceKm = prevOdometerKm !== null ? round(o.odometer_km - prevOdometerKm, 1) : null
  const pricePerLitre = o.litres !== 0 ? round(o.total_cost / o.litres, 2) : null

  const intervalMeasurable =
    prevOdometerKm !== null &&
    !o.missed_previous &&
    o.is_full_tank &&
    (prevIsFull ?? false) &&
    distanceKm !== null &&
    distanceKm > 0

  const actualL100km = intervalMeasurable ? round((o.litres * 100) / distanceKm!, 2) : null

  const costMeasurable = prevOdometerKm !== null && !o.missed_previous && distanceKm !== null && distanceKm > 0
  const costPerKm = costMeasurable ? round(o.total_cost / distanceKm!, 4) : null

  const rangeEstimateErrorKm =
    prevRangeEstimate !== null && prevOdometerKm !== null && distanceKm !== null
      ? round(distanceKm - prevRangeEstimate, 0)
      : null

  const daysSincePrev =
    prevFilledAt !== null
      ? Math.floor((new Date(o.filled_at).getTime() - new Date(prevFilledAt).getTime()) / 86_400_000)
      : null

  return {
    ...o,
    prev_odometer_km: prevOdometerKm,
    prev_is_full: prevIsFull,
    prev_range_estimate: prevRangeEstimate,
    prev_filled_at: prevFilledAt,
    distance_km: distanceKm,
    price_per_litre: pricePerLitre,
    actual_l_per_100km: actualL100km,
    cost_per_km: costPerKm,
    range_estimate_error_km: rangeEstimateErrorKm,
    days_since_prev: daysSincePrev,
  }
}

const validConsumption = (rows: EnrichedFillUpRow[]) => rows.filter((r) => r.actual_l_per_100km !== null)

const chronological = <T extends EnrichedFillUpRow>(rows: T[]): T[] =>
  [...rows].sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime())

const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length

// ---------------------------------------------------------------------------
// 1 & 3 — Hero: last tank + rolling averages
// ---------------------------------------------------------------------------

export interface LastTankSummary {
  actualL100km: number
  deltaVsRolling5: number | null
  direction: 'better' | 'worse' | 'flat' | null
}

export function lastTankSummary(rows: EnrichedFillUpRow[]): LastTankSummary | null {
  const chrono = validConsumption(chronological(rows))
  if (chrono.length === 0) return null
  const latest = chrono[chrono.length - 1]
  const priorFive = chrono.slice(-6, -1)
  const rollingAvg = average(priorFive.map((r) => r.actual_l_per_100km!))
  const delta = rollingAvg !== null ? round(latest.actual_l_per_100km! - rollingAvg, 2) : null
  return {
    actualL100km: latest.actual_l_per_100km!,
    deltaVsRolling5: delta,
    direction: delta === null ? null : delta < -0.05 ? 'better' : delta > 0.05 ? 'worse' : 'flat',
  }
}

export function costPer100km(row: EnrichedFillUpRow): number | null {
  return row.cost_per_km === null ? null : round(row.cost_per_km * 100, 2)
}

export interface RollingAverages {
  last5: number | null
  lifetime: number | null
}

export function rollingAverages(rows: EnrichedFillUpRow[]): RollingAverages {
  const chrono = validConsumption(chronological(rows))
  const last5 = chrono.slice(-5).map((r) => r.actual_l_per_100km!)
  const lifetime = chrono.map((r) => r.actual_l_per_100km!)
  return {
    last5: last5.length === 0 ? null : round(average(last5)!, 2),
    lifetime: lifetime.length === 0 ? null : round(average(lifetime)!, 2),
  }
}

// ---------------------------------------------------------------------------
// 4 — Trend chart series (L/100km per fill + rolling-average overlay)
// ---------------------------------------------------------------------------

export interface TrendPoint {
  filledAt: string
  actualL100km: number
  rollingAvg: number
}

export function trendSeries(rows: EnrichedFillUpRow[], window = 5): TrendPoint[] {
  const chrono = validConsumption(chronological(rows))
  return chrono.map((row, i) => {
    const windowSlice = chrono.slice(Math.max(0, i - window + 1), i + 1)
    return {
      filledAt: row.filled_at,
      actualL100km: row.actual_l_per_100km!,
      rollingAvg: round(average(windowSlice.map((r) => r.actual_l_per_100km!))!, 2),
    }
  })
}

// ---------------------------------------------------------------------------
// 5 — Best and worst tank
// ---------------------------------------------------------------------------

export interface BestWorstTank {
  best: EnrichedFillUpRow
  worst: EnrichedFillUpRow
  annualisedRandDifference: number | null
}

export function bestWorstTank(rows: EnrichedFillUpRow[]): BestWorstTank | null {
  const valid = validConsumption(rows)
  if (valid.length < 2) return null
  const best = valid.reduce((a, b) => (b.actual_l_per_100km! < a.actual_l_per_100km! ? b : a))
  const worst = valid.reduce((a, b) => (b.actual_l_per_100km! > a.actual_l_per_100km! ? b : a))
  const annualDistance = projectedAnnualDistanceKm(rows)
  const avgPrice = averagePricePerLitre(rows)
  const annualisedRandDifference =
    annualDistance !== null && avgPrice !== null
      ? round(((worst.actual_l_per_100km! - best.actual_l_per_100km!) / 100) * annualDistance * avgPrice, 2)
      : null
  return { best, worst, annualisedRandDifference }
}

// ---------------------------------------------------------------------------
// 6 — Seasonal split (needs 12+ months of history)
// ---------------------------------------------------------------------------

export interface SeasonalPoint {
  month: number // 0-11
  avgL100km: number
}

export function seasonalSplit(rows: EnrichedFillUpRow[]): SeasonalPoint[] | null {
  const chrono = validConsumption(chronological(rows))
  if (chrono.length === 0) return null
  const first = new Date(chrono[0].filled_at)
  const last = new Date(chrono[chrono.length - 1].filled_at)
  const monthsSpanned = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth())
  if (monthsSpanned < 12) return null

  const byMonth = new Map<number, number[]>()
  for (const row of chrono) {
    const month = new Date(row.filled_at).getMonth()
    const list = byMonth.get(month)
    if (list) list.push(row.actual_l_per_100km!)
    else byMonth.set(month, [row.actual_l_per_100km!])
  }
  return Array.from(byMonth.entries())
    .map(([month, values]) => ({ month, avgL100km: round(average(values)!, 2) }))
    .sort((a, b) => a.month - b.month)
}

// ---------------------------------------------------------------------------
// 7 — Spend this month / this year + monthly sparkline
// ---------------------------------------------------------------------------

export interface SpendSummary {
  thisMonth: number
  thisYear: number
  monthlySparkline: Array<{ month: string; total: number }>
}

export function spendSummary(rows: EnrichedFillUpRow[], now = new Date()): SpendSummary {
  const y = now.getFullYear()
  const m = now.getMonth()

  const thisMonth = rows
    .filter((r) => {
      const d = new Date(r.filled_at)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .reduce((s, r) => s + r.total_cost, 0)

  const thisYear = rows.filter((r) => new Date(r.filled_at).getFullYear() === y).reduce((s, r) => s + r.total_cost, 0)

  const sparklineMap = new Map<string, number>()
  for (const r of chronological(rows)) {
    const d = new Date(r.filled_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    sparklineMap.set(key, (sparklineMap.get(key) ?? 0) + r.total_cost)
  }

  return {
    thisMonth: round(thisMonth, 2),
    thisYear: round(thisYear, 2),
    monthlySparkline: Array.from(sparklineMap.entries()).map(([month, total]) => ({ month, total: round(total, 2) })),
  }
}

// ---------------------------------------------------------------------------
// 8 — Price paid per litre: latest vs 12-month average, percentile
// ---------------------------------------------------------------------------

export interface PricePaidSummary {
  latest: number
  twelveMonthAvg: number | null
  percentile: number
}

export function pricePaidSummary(rows: EnrichedFillUpRow[], now = new Date()): PricePaidSummary | null {
  const priced = rows.filter((r): r is EnrichedFillUpRow & { price_per_litre: number } => r.price_per_litre !== null)
  if (priced.length === 0) return null
  const chrono = chronological(priced)
  const latestRow = chrono[chrono.length - 1]

  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 12)
  const last12mo = priced.filter((r) => new Date(r.filled_at) >= cutoff).map((r) => r.price_per_litre)

  const allPrices = priced.map((r) => r.price_per_litre).sort((a, b) => a - b)
  const rank = allPrices.filter((p) => p <= latestRow.price_per_litre).length
  const percentile = round((rank / allPrices.length) * 100, 0)

  return {
    latest: latestRow.price_per_litre,
    twelveMonthAvg: last12mo.length === 0 ? null : round(average(last12mo)!, 2),
    percentile,
  }
}

// ---------------------------------------------------------------------------
// 9 — Projected annual cost + distance
// ---------------------------------------------------------------------------

export function projectedAnnualDistanceKm(rows: EnrichedFillUpRow[]): number | null {
  const withDistance = rows.filter((r) => r.distance_km !== null && r.distance_km > 0 && r.days_since_prev !== null)
  const totalDistance = withDistance.reduce((s, r) => s + r.distance_km!, 0)
  const totalDays = withDistance.reduce((s, r) => s + r.days_since_prev!, 0)
  if (totalDays === 0) return null
  return round((totalDistance / totalDays) * 365, 0)
}

export interface ProjectedAnnualCost {
  annualCost: number
  annualDistanceKm: number
}

export function projectedAnnualCost(rows: EnrichedFillUpRow[]): ProjectedAnnualCost | null {
  if (rows.length === 0) return null
  const chrono = chronological(rows)
  const lifetimeCost = chrono.reduce((s, r) => s + r.total_cost, 0)
  const spanDays =
    (new Date(chrono[chrono.length - 1].filled_at).getTime() - new Date(chrono[0].filled_at).getTime()) / 86_400_000
  const annualDistanceKm = projectedAnnualDistanceKm(rows)
  if (spanDays <= 0 || annualDistanceKm === null) return null
  return {
    annualCost: round((lifetimeCost / spanDays) * 365, 2),
    annualDistanceKm,
  }
}

// ---------------------------------------------------------------------------
// 10 — The 10% card
// ---------------------------------------------------------------------------

export function tenPercentSavingsPerYear(rows: EnrichedFillUpRow[]): number | null {
  const cost = projectedAnnualCost(rows)
  if (cost === null) return null
  return round(cost.annualCost * 0.1, 2)
}

// ---------------------------------------------------------------------------
// 11 — Average cost per fill, average days between fills
// ---------------------------------------------------------------------------

export function averageCostPerFill(rows: FillUpRow[]): number | null {
  if (rows.length === 0) return null
  return round(average(rows.map((r) => r.total_cost))!, 2)
}

export function averageDaysBetweenFills(rows: EnrichedFillUpRow[]): number | null {
  const gaps = rows.filter((r) => r.days_since_prev !== null).map((r) => r.days_since_prev!)
  return gaps.length === 0 ? null : round(average(gaps)!, 1)
}

// ---------------------------------------------------------------------------
// 12 — Trip-computer bias: "your dash reports X% better than reality"
// ---------------------------------------------------------------------------

export function tripComputerBias(row: EnrichedFillUpRow): number | null {
  if (row.actual_l_per_100km === null || row.computer_l_per_100km === null || row.actual_l_per_100km === 0) {
    return null
  }
  return round(((row.computer_l_per_100km - row.actual_l_per_100km) / row.actual_l_per_100km) * 100, 1)
}

export interface BiasPoint {
  filledAt: string
  claimed: number
  actual: number
  biasPct: number
}

export function tripComputerBiasSeries(rows: EnrichedFillUpRow[]): BiasPoint[] {
  return chronological(rows)
    .filter((r) => r.actual_l_per_100km !== null && r.computer_l_per_100km !== null)
    .map((r) => ({
      filledAt: r.filled_at,
      claimed: r.computer_l_per_100km!,
      actual: r.actual_l_per_100km!,
      biasPct: tripComputerBias(r)!,
    }))
}

export function averageTripComputerBias(rows: EnrichedFillUpRow[]): number | null {
  const series = tripComputerBiasSeries(rows)
  return series.length === 0 ? null : round(average(series.map((p) => p.biasPct))!, 1)
}

// ---------------------------------------------------------------------------
// 13 — Range accuracy
// ---------------------------------------------------------------------------

export interface RangeAccuracy {
  avgErrorKm: number
  worst: { row: EnrichedFillUpRow; errorKm: number }
}

export function rangeAccuracy(rows: EnrichedFillUpRow[]): RangeAccuracy | null {
  const withError = rows.filter((r) => r.range_estimate_error_km !== null)
  if (withError.length === 0) return null
  const avgErrorKm = round(average(withError.map((r) => r.range_estimate_error_km!))!, 0)
  // Worst under-delivery: the promised range fell shortest of actual distance achieved,
  // i.e. the most negative error.
  const worstRow = withError.reduce((a, b) => (b.range_estimate_error_km! < a.range_estimate_error_km! ? b : a))
  return { avgErrorKm, worst: { row: worstRow, errorKm: worstRow.range_estimate_error_km! } }
}

// ---------------------------------------------------------------------------
// 14 — Inferred usable tank
// ---------------------------------------------------------------------------

export interface InferredUsableTank {
  largestFillL: number
  pctOfSpec: number | null
}

export function inferredUsableTank(rows: FillUpRow[], tankCapacityL: number | null): InferredUsableTank | null {
  const fullFills = rows.filter((r) => r.is_full_tank)
  if (fullFills.length === 0) return null
  const largestFillL = Math.max(...fullFills.map((r) => r.litres))
  return {
    largestFillL: round(largestFillL, 2),
    pctOfSpec: tankCapacityL ? round((largestFillL / tankCapacityL) * 100, 0) : null,
  }
}

// ---------------------------------------------------------------------------
// 15 — Distance per tank
// ---------------------------------------------------------------------------

export interface DistancePerTank {
  average: number
  best: number
}

export function distancePerTank(rows: EnrichedFillUpRow[]): DistancePerTank | null {
  const withDistance = rows.filter((r) => r.distance_km !== null && r.distance_km > 0).map((r) => r.distance_km!)
  if (withDistance.length === 0) return null
  return { average: round(average(withDistance)!, 0), best: round(Math.max(...withDistance), 0) }
}

// ---------------------------------------------------------------------------
// 17 — Paid vs official price
// ---------------------------------------------------------------------------

export function averagePricePerLitre(rows: EnrichedFillUpRow[]): number | null {
  const priced = rows.filter((r) => r.price_per_litre !== null).map((r) => r.price_per_litre!)
  return priced.length === 0 ? null : average(priced)
}

export interface PaidVsOfficial {
  paid: number
  official: number
  discrepancyPct: number
}

export function paidVsOfficial(
  row: EnrichedFillUpRow,
  officialPrice: FuelPriceRow | null,
): PaidVsOfficial | null {
  if (row.price_per_litre === null || officialPrice === null || officialPrice.price_per_l === 0) return null
  const discrepancyPct = round(((row.price_per_litre - officialPrice.price_per_l) / officialPrice.price_per_l) * 100, 1)
  return { paid: row.price_per_litre, official: officialPrice.price_per_l, discrepancyPct }
}

export function findOfficialPrice(
  prices: FuelPriceRow[],
  fuelType: string,
  priceZone: PriceZone,
  onOrBefore: string,
): FuelPriceRow | null {
  const target = new Date(onOrBefore).getTime()
  const matching = prices
    .filter((p) => p.fuel_type === fuelType && p.price_zone === priceZone && new Date(p.effective_date).getTime() <= target)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
  return matching[0] ?? null
}

// ---------------------------------------------------------------------------
// 18 — Since last fill
// ---------------------------------------------------------------------------

export interface SinceLastFill {
  daysElapsed: number
  litresRemainingEstimate: number | null
}

export function sinceLastFill(rows: EnrichedFillUpRow[], now = new Date()): SinceLastFill | null {
  const chrono = chronological(rows)
  if (chrono.length === 0) return null
  const last = chrono[chrono.length - 1]
  const daysElapsed = Math.floor((now.getTime() - new Date(last.filled_at).getTime()) / 86_400_000)

  const avgL100km = rollingAverages(rows).lifetime
  const avgDistancePerDay = averageDaysBetweenFills(rows)
  const distPerTank = distancePerTank(rows)
  let litresRemainingEstimate: number | null = null
  if (avgL100km !== null && avgDistancePerDay !== null && avgDistancePerDay > 0 && distPerTank !== null) {
    const estDistancePerDay = distPerTank.average / avgDistancePerDay
    const litresUsed = ((avgL100km / 100) * estDistancePerDay * daysElapsed)
    litresRemainingEstimate = round(Math.max(last.litres - litresUsed, 0), 1)
  }

  return { daysElapsed, litresRemainingEstimate }
}
