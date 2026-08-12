import { InsightCard, EmptyState } from '../InsightCard'
import { averageCostPerFill, averageDaysBetweenFills } from '../../../lib/metrics'
import { formatCurrency, formatDays } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function AveragesCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const avgCost = averageCostPerFill(rows)
  const avgDays = averageDaysBetweenFills(rows)

  return (
    <InsightCard label="Averages" index={index}>
      {avgCost === null ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Per fill</p>
            <p className="text-xl font-semibold text-white">{formatCurrency(avgCost)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Between fills</p>
            <p className="text-xl font-semibold text-white">{avgDays !== null ? formatDays(avgDays) : '—'}</p>
          </div>
        </div>
      )}
    </InsightCard>
  )
}
