import { InsightCard, EmptyState } from '../InsightCard'
import { bestWorstTank } from '../../../lib/metrics'
import { L100KM_UNIT, formatCurrency, formatDate, formatDecimal } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

function Row({ label, tone, date, value }: { label: string; tone: string; date: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className={`text-xs font-medium ${tone}`}>{label}</p>
        <p className="text-[11px] text-white/40">{date}</p>
      </div>
      <p className="text-2xl font-semibold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatDecimal(value)}
      </p>
    </div>
  )
}

export function BestWorstCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const result = bestWorstTank(rows)

  return (
    <InsightCard label="Best and worst tank" index={index}>
      {result === null ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <Row label="Best" tone="text-[--color-good]" date={formatDate(result.best.filled_at)} value={result.best.actual_l_per_100km} />
          <Row label="Worst" tone="text-[--color-bad]" date={formatDate(result.worst.filled_at)} value={result.worst.actual_l_per_100km} />
          <p className="text-[11px] text-white/35">{L100KM_UNIT}</p>
          {result.annualisedRandDifference !== null && (
            <p className="text-xs text-white/40">
              Closing that gap is worth about {formatCurrency(result.annualisedRandDifference, { decimals: false })}/year.
            </p>
          )}
        </div>
      )}
    </InsightCard>
  )
}
