import { InsightCard, EmptyState } from '../InsightCard'
import { rangeAccuracy } from '../../../lib/metrics'
import { formatDate, formatKm } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function RangeAccuracyCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const result = rangeAccuracy(rows)

  return (
    <InsightCard label="Range accuracy" index={index}>
      {result === null ? (
        <EmptyState message="Log the range estimate shown at your previous fill-up to unlock this." />
      ) : (
        <div>
          <p className="text-xl font-semibold text-white">
            {result.avgErrorKm > 0 ? '+' : ''}
            {formatKm(result.avgErrorKm)} average
          </p>
          <p className="mt-1 text-xs text-white/40">
            Worst under-delivery: {formatKm(result.worst.errorKm)} on {formatDate(result.worst.row.filled_at)}
          </p>
        </div>
      )}
    </InsightCard>
  )
}
