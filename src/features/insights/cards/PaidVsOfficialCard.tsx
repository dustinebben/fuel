import { InsightCard, EmptyState } from '../InsightCard'
import { findOfficialPrice, paidVsOfficial } from '../../../lib/metrics'
import { formatCurrency, formatPercent } from '../../../lib/format'
import type { EnrichedFillUpRow, FuelPriceRow, VehicleRow } from '../../../lib/database.types'

export function PaidVsOfficialCard({
  rows,
  prices,
  vehicle,
  index,
}: {
  rows: EnrichedFillUpRow[]
  prices: FuelPriceRow[]
  vehicle: VehicleRow | null
  index?: number
}) {
  const chrono = [...rows].sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime())
  const latest = chrono[chrono.length - 1]
  const official = latest && vehicle ? findOfficialPrice(prices, vehicle.fuel_type, vehicle.price_zone, latest.filled_at) : null
  const result = latest && official ? paidVsOfficial(latest, official) : null

  return (
    <InsightCard label="Paid vs official price" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div>
          <p className="text-xl font-semibold text-white">
            {formatCurrency(result.paid)} <span className="text-sm font-normal text-white/40">vs {formatCurrency(result.official)}</span>
          </p>
          <p className={`mt-1 text-xs ${Math.abs(result.discrepancyPct) > 2 ? 'text-[--color-warn]' : 'text-white/40'}`}>
            {formatPercent(result.discrepancyPct)}
            {Math.abs(result.discrepancyPct) > 2 ? ' — worth double-checking your litres or rand entry' : ' — checks out'}
          </p>
        </div>
      )}
    </InsightCard>
  )
}
