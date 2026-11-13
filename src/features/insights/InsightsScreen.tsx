import type { EnrichedFillUpRow, VehicleRow } from '../../lib/database.types'
import { useFuelPrices } from './useFuelPrices'
import { RollingAveragesCard } from './cards/RollingAveragesCard'
import { TrendChartCard } from './cards/TrendChartCard'
import { BestWorstCard } from './cards/BestWorstCard'
import { SeasonalCard } from './cards/SeasonalCard'
import { SpendCard } from './cards/SpendCard'
import { PricePaidCard } from './cards/PricePaidCard'
import { ProjectedCostCard } from './cards/ProjectedCostCard'
import { TenPercentCard } from './cards/TenPercentCard'
import { AveragesCard } from './cards/AveragesCard'
import { BiasCard } from './cards/BiasCard'
import { RangeAccuracyCard } from './cards/RangeAccuracyCard'
import { UsableTankCard } from './cards/UsableTankCard'
import { DistancePerTankCard } from './cards/DistancePerTankCard'
import { NextPriceChangeCard } from './cards/NextPriceChangeCard'
import { PaidVsOfficialCard } from './cards/PaidVsOfficialCard'
import { SinceLastFillCard } from './cards/SinceLastFillCard'
import { NextFillCard } from './cards/NextFillCard'

export function InsightsScreen({ rows, vehicle }: { rows: EnrichedFillUpRow[]; vehicle: VehicleRow | null }) {
  const { data: prices = [] } = useFuelPrices()

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 pb-32 pt-6" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Insights</h1>

      <p className="pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Efficiency</p>
      <div className="grid grid-cols-2 gap-3">
        <RollingAveragesCard rows={rows} index={0} />
        <BestWorstCard rows={rows} index={1} />
        <TrendChartCard rows={rows} index={2} />
        <SeasonalCard rows={rows} index={3} />
      </div>

      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Money</p>
      <div className="grid grid-cols-2 gap-3">
        <SpendCard rows={rows} index={4} className="col-span-2" />
        <PricePaidCard rows={rows} index={5} />
        <ProjectedCostCard rows={rows} index={6} />
        <TenPercentCard rows={rows} index={7} />
        <AveragesCard rows={rows} index={8} />
      </div>

      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Car vs reality</p>
      <div className="grid grid-cols-2 gap-3">
        <BiasCard rows={rows} index={9} />
        <RangeAccuracyCard rows={rows} index={10} />
        <UsableTankCard rows={rows} vehicle={vehicle} index={11} />
        <DistancePerTankCard rows={rows} index={12} />
      </div>

      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">South Africa</p>
      <div className="grid grid-cols-2 gap-3">
        <NextPriceChangeCard vehicle={vehicle} prices={prices} tankCapacityL={vehicle?.tank_capacity_l ?? null} index={13} />
        <PaidVsOfficialCard rows={rows} prices={prices} vehicle={vehicle} index={14} />
      </div>

      <p className="pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">Timing</p>
      <div className="grid grid-cols-2 gap-3">
        <SinceLastFillCard rows={rows} index={15} />
        <NextFillCard rows={rows} index={16} />
      </div>
    </div>
  )
}
