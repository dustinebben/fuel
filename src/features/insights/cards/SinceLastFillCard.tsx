import { InsightCard, EmptyState } from '../InsightCard'
import { sinceLastFill } from '../../../lib/metrics'
import { formatDays, formatLitres } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function SinceLastFillCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const result = sinceLastFill(rows)

  return (
    <InsightCard label="Since last fill" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div>
          <p className="text-xl font-semibold text-white">{formatDays(result.daysElapsed)}</p>
          {result.litresRemainingEstimate !== null && (
            <p className="mt-1 text-xs text-white/40">~{formatLitres(result.litresRemainingEstimate)} remaining, estimated</p>
          )}
        </div>
      )}
    </InsightCard>
  )
}
