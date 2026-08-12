import { InsightCard, EmptyState } from '../InsightCard'
import { pricePaidSummary } from '../../../lib/metrics'
import { formatCurrency } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function PricePaidCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const summary = pricePaidSummary(rows)

  return (
    <InsightCard label="Price paid per litre" index={index}>
      {summary === null ? (
        <EmptyState />
      ) : (
        <div>
          <p className="text-2xl font-semibold text-white">{formatCurrency(summary.latest)}</p>
          <p className="mt-1 text-xs text-white/40">
            12-month avg {summary.twelveMonthAvg !== null ? formatCurrency(summary.twelveMonthAvg) : '—'} · {summary.percentile}th percentile of what you've paid
          </p>
        </div>
      )}
    </InsightCard>
  )
}
