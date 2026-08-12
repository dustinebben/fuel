import { InsightCard, EmptyState } from '../InsightCard'
import { rollingAverages } from '../../../lib/metrics'
import { formatL100km } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function RollingAveragesCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const { last5, lifetime } = rollingAverages(rows)

  return (
    <InsightCard label="Rolling averages" index={index}>
      {last5 === null && lifetime === null ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40">Last 5 fills</p>
            <p className="text-xl font-semibold text-white">{formatL100km(last5)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Lifetime</p>
            <p className="text-xl font-semibold text-white">{formatL100km(lifetime)}</p>
          </div>
        </div>
      )}
    </InsightCard>
  )
}
