import { InsightCard, EmptyState } from '../InsightCard'
import { nextFillEstimate } from '../../../lib/metrics'
import { formatDays } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function NextFillCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const estimate = nextFillEstimate(rows)

  return (
    <InsightCard label="Next fill" index={index}>
      {estimate === null ? (
        <EmptyState message="Two fill-ups and I can predict the next one." />
      ) : (
        <div>
          <p className={`text-xl font-semibold ${estimate.dueInDays < 0 ? 'text-[--color-warn]' : 'text-white'}`}>
            {estimate.dueInDays >= 0 ? `~${formatDays(Math.round(estimate.dueInDays))}` : `${formatDays(Math.round(-estimate.dueInDays))} over`}
          </p>
          <p className="mt-1 text-xs text-white/40">
            You usually fill every {formatDays(Math.round(estimate.averageGapDays))}; last fill {formatDays(estimate.daysSince)} ago.
          </p>
        </div>
      )}
    </InsightCard>
  )
}
