import { InsightCard, EmptyState } from '../InsightCard'
import { inferredUsableTank } from '../../../lib/metrics'
import { formatLitres } from '../../../lib/format'
import type { EnrichedFillUpRow, VehicleRow } from '../../../lib/database.types'

export function UsableTankCard({ rows, vehicle, index }: { rows: EnrichedFillUpRow[]; vehicle: VehicleRow | null; index?: number }) {
  const result = inferredUsableTank(rows, vehicle?.tank_capacity_l ?? null)

  return (
    <InsightCard label="Inferred usable tank" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div>
          <p className="text-xl font-semibold text-white">{formatLitres(result.largestFillL)}</p>
          <p className="mt-1 text-xs text-white/40">
            {result.pctOfSpec !== null ? `${result.pctOfSpec}% of the ${vehicle!.tank_capacity_l}L spec` : 'Add tank capacity in Settings to compare'}
          </p>
        </div>
      )}
    </InsightCard>
  )
}
