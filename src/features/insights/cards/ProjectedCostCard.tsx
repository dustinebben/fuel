import { InsightCard, EmptyState } from '../InsightCard'
import { projectedAnnualCost } from '../../../lib/metrics'
import { formatCurrency, formatKm } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function ProjectedCostCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const projected = projectedAnnualCost(rows)

  return (
    <InsightCard label="Projected annual cost" index={index}>
      {projected === null ? (
        <EmptyState />
      ) : (
        <div>
          <p className="text-2xl font-semibold text-white">{formatCurrency(projected.annualCost, { decimals: false })}</p>
          <p className="mt-1 text-xs text-white/40">at {formatKm(projected.annualDistanceKm)}/year</p>
        </div>
      )}
    </InsightCard>
  )
}
