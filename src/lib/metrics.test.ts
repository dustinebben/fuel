import { describe, expect, it } from 'vitest'
import {
  averageTripComputerBias,
  bestWorstTank,
  distancePerTank,
  enrichFillUps,
  inferredUsableTank,
  lastTankSummary,
  latestCostPer100km,
  paidVsOfficial,
  projectedAnnualDistanceKm,
  rangeAccuracy,
  nextFillEstimate,
  previewConsumption,
  rollingAverages,
  sinceLastFill,
  tripComputerBias,
} from './metrics'
import type { FillUpRow } from './database.types'

const VEHICLE_ID = 'v1'
const USER_ID = 'u1'

let seq = 0
function fillUp(overrides: Partial<FillUpRow>): FillUpRow {
  seq += 1
  return {
    id: `f${seq}`,
    user_id: USER_ID,
    vehicle_id: VEHICLE_ID,
    filled_at: '2026-01-01T08:00:00Z',
    odometer_km: 0,
    litres: 0,
    total_cost: 0,
    computer_l_per_100km: null,
    range_estimate_km: null,
    is_full_tank: true,
    missed_previous: false,
    station: null,
    fuel_grade: null,
    notes: null,
    created_at: '2026-01-01T08:00:00Z',
    ...overrides,
  }
}

describe('spec §5 reference case', () => {
  // Fill 1: odometer 118 000 km, full tank.
  // Fill 2: odometer 118 620 km, 48.30 L, R1 260.63, dash showed 7.4 L/100km,
  // previous fill's range estimate was 640 km.
  const fill1 = fillUp({
    odometer_km: 118_000,
    litres: 40,
    total_cost: 1000,
    is_full_tank: true,
    range_estimate_km: 640,
    filled_at: '2026-06-01T08:00:00Z',
  })
  const fill2 = fillUp({
    odometer_km: 118_620,
    litres: 48.3,
    total_cost: 1260.63,
    computer_l_per_100km: 7.4,
    is_full_tank: true,
    filled_at: '2026-06-15T08:00:00Z',
  })

  const [, enriched2] = enrichFillUps([fill1, fill2])

  it('distance_km = 620', () => {
    expect(enriched2.distance_km).toBe(620)
  })

  it('price_per_litre = R26.10', () => {
    expect(enriched2.price_per_litre).toBeCloseTo(26.1, 2)
  })

  it('actual_l_per_100km = 7.79', () => {
    expect(enriched2.actual_l_per_100km).toBeCloseTo(7.79, 2)
  })

  it('cost_per_km = R2.0333 -> R203.33 / 100km (spec §5 table has a decimal typo: R1260.63 / 620 = R2.0333, not R0.2033)', () => {
    expect(enriched2.cost_per_km).toBeCloseTo(2.0333, 4)
    expect(enriched2.cost_per_km! * 100).toBeCloseTo(203.33, 1)
  })

  it('trip-computer bias = -5.0%', () => {
    expect(tripComputerBias(enriched2)).toBeCloseTo(-5.0, 1)
  })

  it('range_estimate_error_km = -20 km', () => {
    expect(enriched2.range_estimate_error_km).toBe(-20)
  })
})

describe('the four null paths for actual_l_per_100km', () => {
  it('is null on the first-ever fill for a vehicle', () => {
    const [enriched] = enrichFillUps([fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true })])
    expect(enriched.actual_l_per_100km).toBeNull()
  })

  it('is null when this fill is not a full tank', () => {
    const fills = [
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_500, litres: 20, is_full_tank: false, filled_at: '2026-01-10T00:00:00Z' }),
    ]
    const [, second] = enrichFillUps(fills)
    expect(second.actual_l_per_100km).toBeNull()
  })

  it('is null when there is no earlier full tank to measure from', () => {
    const fills = [
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: false, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_500, litres: 30, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ]
    const [, second] = enrichFillUps(fills)
    expect(second.actual_l_per_100km).toBeNull()
    expect(second.span_litres).toBeNull()
  })

  it('is null when missed_previous is true', () => {
    const fills = [
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({
        odometer_km: 100_800,
        litres: 55,
        is_full_tank: true,
        missed_previous: true,
        filled_at: '2026-01-15T00:00:00Z',
      }),
    ]
    const [, second] = enrichFillUps(fills)
    expect(second.actual_l_per_100km).toBeNull()
  })

  it('is null when the odometer did not increase', () => {
    const fills = [
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ]
    // enrichFillUps sorts by odometer, so an equal odometer keeps insertion order;
    // simulate the "did not increase" case by forcing a lower second odometer directly.
    const enriched = enrichFillUps([
      fillUp({ odometer_km: 100_500, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_500, litres: 40, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(fills).toBeTruthy() // keep fixture referenced
    expect(enriched[1].actual_l_per_100km).toBeNull()
    expect(enriched[1].distance_km).toBe(0)
  })
})

describe('full-to-full spans (partial fills in between)', () => {
  const full1 = () => fillUp({ odometer_km: 100_000, litres: 40, total_cost: 1000, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' })

  it('measures from the previous FULL tank, summing partial fills in between', () => {
    const [, partial, last] = enrichFillUps([
      full1(),
      fillUp({ odometer_km: 100_300, litres: 20, total_cost: 500, is_full_tank: false, filled_at: '2026-01-05T00:00:00Z' }),
      fillUp({ odometer_km: 100_600, litres: 25, total_cost: 650, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(partial.actual_l_per_100km).toBeNull()
    expect(last.actual_l_per_100km).toBe(7.5) // (20 + 25) L over 600 km
    expect(last.span_litres).toBe(45)
    expect(last.span_distance_km).toBe(600)
    expect(last.span_fills).toBe(2)
    expect(last.cost_per_km).toBeCloseTo(1150 / 600, 4)
  })

  it('a partial fill never gets a consumption or cost-per-km figure of its own', () => {
    const [, partial] = enrichFillUps([
      full1(),
      fillUp({ odometer_km: 100_300, litres: 20, total_cost: 500, is_full_tank: false, filled_at: '2026-01-05T00:00:00Z' }),
    ])
    expect(partial.actual_l_per_100km).toBeNull()
    expect(partial.cost_per_km).toBeNull()
  })

  it('is null if ANY fill inside the span is marked missed_previous', () => {
    const [, , last] = enrichFillUps([
      full1(),
      fillUp({ odometer_km: 100_300, litres: 20, is_full_tank: false, missed_previous: true, filled_at: '2026-01-05T00:00:00Z' }),
      fillUp({ odometer_km: 100_600, litres: 25, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(last.actual_l_per_100km).toBeNull()
    expect(last.cost_per_km).toBeNull()
  })

  it('consecutive full tanks behave exactly as before (span of one fill)', () => {
    const [, second] = enrichFillUps([
      full1(),
      fillUp({ odometer_km: 100_500, litres: 30, total_cost: 780, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(second.actual_l_per_100km).toBe(6)
    expect(second.span_fills).toBe(1)
  })

  it('the next span starts at the latest full tank, not at an older one', () => {
    const rows = enrichFillUps([
      full1(),
      fillUp({ odometer_km: 100_500, litres: 30, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
      fillUp({ odometer_km: 101_000, litres: 35, is_full_tank: true, filled_at: '2026-01-20T00:00:00Z' }),
    ])
    expect(rows[2].span_litres).toBe(35)
    expect(rows[2].span_distance_km).toBe(500)
    expect(rows[2].actual_l_per_100km).toBe(7)
  })
})

describe('other metrics', () => {
  const rows = enrichFillUps([
    fillUp({ odometer_km: 100_000, litres: 40, total_cost: 800, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
    fillUp({
      odometer_km: 100_500,
      litres: 35,
      total_cost: 700,
      is_full_tank: true,
      computer_l_per_100km: 6.5,
      filled_at: '2026-01-15T00:00:00Z',
    }),
    fillUp({
      odometer_km: 101_100,
      litres: 45,
      total_cost: 900,
      is_full_tank: true,
      computer_l_per_100km: 7.0,
      filled_at: '2026-02-01T00:00:00Z',
    }),
  ])

  it('rollingAverages computes lifetime and last-5 averages from valid intervals only', () => {
    const { lifetime, last5 } = rollingAverages(rows)
    expect(lifetime).not.toBeNull()
    expect(last5).toBe(lifetime) // fewer than 5 valid intervals so far
  })

  it('lastTankSummary reports the most recent valid interval', () => {
    const summary = lastTankSummary(rows)
    expect(summary).not.toBeNull()
    expect(summary!.actualL100km).toBe(rows[2].actual_l_per_100km)
  })

  it('bestWorstTank picks the lowest and highest actual_l_per_100km', () => {
    const result = bestWorstTank(rows)
    expect(result).not.toBeNull()
    expect(result!.best.actual_l_per_100km!).toBeLessThanOrEqual(result!.worst.actual_l_per_100km!)
  })

  it('averageTripComputerBias averages only rows with both figures present', () => {
    expect(averageTripComputerBias(rows)).not.toBeNull()
  })

  it('distancePerTank ignores unmeasurable intervals', () => {
    const result = distancePerTank(rows)
    expect(result).not.toBeNull()
    expect(result!.best).toBeGreaterThanOrEqual(result!.average)
  })

  it('distancePerTank uses full-to-full spans, not the gap since a partial top-up', () => {
    const spans = enrichFillUps([
      fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_300, litres: 20, is_full_tank: false, filled_at: '2026-01-05T00:00:00Z' }),
      fillUp({ odometer_km: 100_600, litres: 25, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(distancePerTank(spans)).toEqual({ average: 600, best: 600 })
  })

  it('distancePerTank is null when no full-to-full span exists', () => {
    expect(distancePerTank(enrichFillUps([fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true })]))).toBeNull()
  })

  it('rangeAccuracy is null with no range estimates logged', () => {
    expect(rangeAccuracy(rows)).toBeNull()
  })

  it('inferredUsableTank ignores partial fills', () => {
    const withPartial = [
      ...rows.map((r) => ({ ...r } as FillUpRow)),
      fillUp({ odometer_km: 101_200, litres: 60, is_full_tank: false }),
    ]
    const result = inferredUsableTank(withPartial, 55)
    expect(result!.largestFillL).toBe(45)
    expect(result!.pctOfSpec).toBeCloseTo((45 / 55) * 100, 0)
  })

  it('projectedAnnualDistanceKm is null with a single fill (no measurable interval)', () => {
    expect(projectedAnnualDistanceKm(enrichFillUps([fillUp({ odometer_km: 1000, litres: 40 })]))).toBeNull()
  })

  it('paidVsOfficial flags a discrepancy against the regulated price', () => {
    const result = paidVsOfficial(rows[0], {
      id: 'p1',
      effective_date: '2026-01-01',
      fuel_type: '95',
      price_zone: 'inland',
      price_per_l: 26.1,
      created_at: '2026-01-01',
    })
    expect(result).not.toBeNull()
    expect(result!.discrepancyPct).not.toBeNull()
  })
})

describe('nextFillEstimate', () => {
  const rows = enrichFillUps([
    fillUp({ odometer_km: 100_000, litres: 40, filled_at: '2026-01-01T00:00:00Z' }),
    fillUp({ odometer_km: 100_500, litres: 35, filled_at: '2026-01-11T00:00:00Z' }),
    fillUp({ odometer_km: 101_000, litres: 35, filled_at: '2026-01-21T00:00:00Z' }),
  ])

  it('is null without a gap to learn from', () => {
    expect(nextFillEstimate(enrichFillUps([fillUp({ odometer_km: 100_000, litres: 40 })]), new Date('2026-02-01'))).toBeNull()
    expect(nextFillEstimate([], new Date('2026-02-01'))).toBeNull()
  })

  it('predicts the next fill from the average gap and time since the last one', () => {
    const result = nextFillEstimate(rows, new Date('2026-01-26T00:00:00Z'))
    expect(result).toEqual({ daysSince: 5, averageGapDays: 10, dueInDays: 5 })
  })

  it('goes negative when overdue', () => {
    expect(nextFillEstimate(rows, new Date('2026-02-05T00:00:00Z'))!.dueInDays).toBe(-5)
  })
})

describe('sinceLastFill litres remaining', () => {
  it('is withheld when the last fill was only a partial top-up (tank content unknown)', () => {
    const partial = enrichFillUps([
      fillUp({ odometer_km: 100_000, litres: 40, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_500, litres: 35, filled_at: '2026-01-11T00:00:00Z' }),
      fillUp({ odometer_km: 100_700, litres: 15, is_full_tank: false, filled_at: '2026-01-15T00:00:00Z' }),
    ])
    expect(sinceLastFill(partial, new Date('2026-01-17T00:00:00Z'))!.litresRemainingEstimate).toBeNull()
  })
})

describe('previewConsumption (live form preview)', () => {
  const history = enrichFillUps([
    fillUp({ odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
    fillUp({ odometer_km: 100_300, litres: 20, is_full_tank: false, filled_at: '2026-01-05T00:00:00Z' }),
  ])

  it('uses the same full-to-full span as the stored data', () => {
    expect(previewConsumption(history, { odometer_km: 100_600, litres: 25, is_full_tank: true, missed_previous: false })).toBe(7.5)
  })

  it('is null for a partial top-up, never a made-up figure', () => {
    expect(previewConsumption(history, { odometer_km: 100_600, litres: 25, is_full_tank: false, missed_previous: false })).toBeNull()
  })

  it('is null when there is no earlier full tank', () => {
    expect(previewConsumption([], { odometer_km: 100_000, litres: 25, is_full_tank: true, missed_previous: false })).toBeNull()
  })

  it('ignores the fill being edited so it is not counted against itself', () => {
    const withEdited = enrichFillUps([
      fillUp({ id: 'keep', odometer_km: 100_000, litres: 40, is_full_tank: true, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ id: 'edit', odometer_km: 100_500, litres: 30, is_full_tank: true, filled_at: '2026-01-10T00:00:00Z' }),
    ])
    expect(previewConsumption(withEdited, { odometer_km: 100_500, litres: 35, is_full_tank: true, missed_previous: false }, 'edit')).toBe(7)
  })
})

describe('latestCostPer100km', () => {
  it('uses the latest MEASURABLE fill, skipping a trailing partial top-up', () => {
    const rows = enrichFillUps([
      fillUp({ odometer_km: 100_000, litres: 40, total_cost: 1000, filled_at: '2026-01-01T00:00:00Z' }),
      fillUp({ odometer_km: 100_500, litres: 30, total_cost: 780, filled_at: '2026-01-10T00:00:00Z' }),
      fillUp({ odometer_km: 100_700, litres: 15, total_cost: 400, is_full_tank: false, filled_at: '2026-01-15T00:00:00Z' }),
    ])
    expect(latestCostPer100km(rows)).toBe(156) // R780 over 500 km
  })

  it('is null when no fill is measurable', () => {
    expect(latestCostPer100km(enrichFillUps([fillUp({ odometer_km: 100_000, litres: 40, total_cost: 1000 })]))).toBeNull()
  })
})

describe('bestWorstTank annualised claim', () => {
  const make = (n: number) =>
    enrichFillUps(
      Array.from({ length: n + 1 }, (_, i) =>
        fillUp({
          odometer_km: 100_000 + i * 500,
          litres: i % 2 === 0 ? 30 : 40,
          total_cost: 800,
          filled_at: `2026-01-${String(1 + i * 3).padStart(2, '0')}T00:00:00Z`,
        }),
      ),
    )

  it('withholds the R/year figure until there are enough measured tanks to trust it', () => {
    expect(bestWorstTank(make(3))!.annualisedRandDifference).toBeNull()
  })

  it('offers it once there are five measured tanks', () => {
    expect(bestWorstTank(make(6))!.annualisedRandDifference).not.toBeNull()
  })
})
