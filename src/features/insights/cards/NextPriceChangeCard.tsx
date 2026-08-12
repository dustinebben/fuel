import { InsightCard, EmptyState } from '../InsightCard'
import { currentPrice, fillBeforeSavings, nextKnownPrice, nextPriceChange } from '../../../lib/fuelPrice'
import { formatCurrency, formatDate, formatDays } from '../../../lib/format'
import type { FuelPriceRow, VehicleRow } from '../../../lib/database.types'

export function NextPriceChangeCard({
  vehicle,
  prices,
  tankCapacityL,
  index,
}: {
  vehicle: VehicleRow | null
  prices: FuelPriceRow[]
  tankCapacityL: number | null
  index?: number
}) {
  if (!vehicle || vehicle.fuel_type === 'diesel-50' || vehicle.fuel_type === 'diesel-500') {
    // Petrol is price-regulated on a public schedule; diesel is a wholesale reference
    // and not scheduled the same way, so this card only makes sense for petrol.
    return (
      <InsightCard label="Next price change" index={index}>
        <EmptyState message="Diesel pricing isn't on the regulated calendar — see Settings for the station comparison instead." />
      </InsightCard>
    )
  }

  const now = new Date()
  const { date, daysUntil } = nextPriceChange(now)
  const current = currentPrice(prices, vehicle.fuel_type, vehicle.price_zone, now)
  const known = nextKnownPrice(prices, vehicle.fuel_type, vehicle.price_zone, now)

  return (
    <InsightCard label="Next price change" index={index}>
      <p className="text-xl font-semibold text-white">{formatDate(date)}</p>
      <p className="mt-1 text-xs text-white/40">{formatDays(daysUntil)} away</p>
      {current && known && tankCapacityL && (
        <p className="mt-2 text-sm text-white">
          Price {known.price_per_l > current.price_per_l ? 'rises' : 'falls'}{' '}
          {formatCurrency(Math.abs(known.price_per_l - current.price_per_l))} — filling before it lands
          {known.price_per_l > current.price_per_l ? ' saves about ' : ' costs about '}
          <span className="font-semibold text-[--color-good]">
            {formatCurrency(Math.abs(fillBeforeSavings(tankCapacityL, current.price_per_l, known.price_per_l)))}
          </span>
          .
        </p>
      )}
    </InsightCard>
  )
}
