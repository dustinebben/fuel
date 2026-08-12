import { InsightCard, EmptyState } from '../InsightCard'
import { distancePerTank } from '../../../lib/metrics'
import { formatKm } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function DistancePerTankCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const result = distancePerTank(rows)

  return (
    <InsightCard label="Distance per tank" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Average</p>
            <p className="text-xl font-semibold text-white">{formatKm(result.average)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Best</p>
            <p className="text-xl font-semibold text-white">{formatKm(result.best)}</p>
          </div>
        </div>
      )}
    </InsightCard>
  )
}
