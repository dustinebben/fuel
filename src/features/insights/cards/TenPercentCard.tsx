import { InsightCard, EmptyState } from '../InsightCard'
import { tenPercentSavingsPerYear } from '../../../lib/metrics'
import { formatCurrency } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function TenPercentCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const savings = tenPercentSavingsPerYear(rows)

  return (
    <InsightCard label="The 10% card" index={index}>
      {savings === null ? (
        <EmptyState />
      ) : (
        <p className="text-sm leading-relaxed text-white">
          Drive 10% more efficiently and you'd save about{' '}
          <span className="font-semibold text-[--color-good]">{formatCurrency(savings, { decimals: false })}</span> a year.
        </p>
      )}
    </InsightCard>
  )
}
