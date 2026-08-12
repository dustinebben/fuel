import { InsightCard, EmptyState } from '../InsightCard'
import { bestWorstTank } from '../../../lib/metrics'
import { formatCurrency, formatDate, formatL100km } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function BestWorstCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const result = bestWorstTank(rows)

  return (
    <InsightCard label="Best and worst tank" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[--color-good]">Best · {formatDate(result.best.filled_at)}</span>
            <span className="font-medium text-white">{formatL100km(result.best.actual_l_per_100km)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[--color-bad]">Worst · {formatDate(result.worst.filled_at)}</span>
            <span className="font-medium text-white">{formatL100km(result.worst.actual_l_per_100km)}</span>
          </div>
          {result.annualisedRandDifference !== null && (
            <p className="pt-1 text-xs text-white/40">
              Closing that gap is worth about {formatCurrency(result.annualisedRandDifference)}/year.
            </p>
          )}
        </div>
      )}
    </InsightCard>
  )
}
