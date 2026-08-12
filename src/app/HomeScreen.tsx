import { useMemo, useState } from 'react'
import { GlassCard } from '../components/glass/GlassCard'
import { FAB } from '../components/glass/FAB'
import { Header } from './Header'
import { AddFillUpSheet } from '../features/fillups/AddFillUpSheet'
import { LastTankCard } from '../features/insights/cards/LastTankCard'
import { CostPer100kmCard } from '../features/insights/cards/CostPer100kmCard'
import { TrendChartCard } from '../features/insights/cards/TrendChartCard'
import { BiasCard } from '../features/insights/cards/BiasCard'
import { RangeAccuracyCard } from '../features/insights/cards/RangeAccuracyCard'
import { NextPriceChangeCard } from '../features/insights/cards/NextPriceChangeCard'
import { useFuelPrices } from '../features/insights/useFuelPrices'
import type { EnrichedFillUpRow, VehicleRow } from '../lib/database.types'

export function HomeScreen({ vehicle, rows }: { vehicle: VehicleRow; rows: EnrichedFillUpRow[] }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { data: prices = [] } = useFuelPrices()

  const latestOdometerKm = rows.length > 0 ? rows[rows.length - 1].odometer_km : null

  const recentStations = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      if (!r.station) continue
      counts.set(r.station, (counts.get(r.station) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s)
  }, [rows])

  return (
    <>
      <Header vehicle={vehicle} latestOdometerKm={latestOdometerKm} />
      <div
        className="mx-auto max-w-lg space-y-3 px-4 pb-32"
        style={{ paddingTop: 'calc(4.5rem + env(safe-area-inset-top))' }}
      >
        <LastTankCard rows={rows} index={0} />
        <div className="grid grid-cols-2 gap-3">
          <CostPer100kmCard rows={rows} index={1} />
          <RangeAccuracyCard rows={rows} index={2} />
        </div>
        <TrendChartCard rows={rows} index={3} />
        <BiasCard rows={rows} index={4} />
        <NextPriceChangeCard vehicle={vehicle} prices={prices} tankCapacityL={vehicle.tank_capacity_l} index={5} />

        {rows.length === 0 && (
          <GlassCard className="p-6 text-center text-sm text-white/50" index={6}>
            Log your first fill-up to bring this to life.
          </GlassCard>
        )}
      </div>

      <FAB onClick={() => setSheetOpen(true)} />
      <AddFillUpSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        vehicleId={vehicle.id}
        tankCapacityL={vehicle.tank_capacity_l}
        rows={rows}
        recentStations={recentStations}
      />
    </>
  )
}
