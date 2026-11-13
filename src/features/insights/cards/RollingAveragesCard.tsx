import { InsightCard, EmptyState } from '../InsightCard'
import { rollingAverages } from '../../../lib/metrics'
import { L100KM_UNIT, formatDecimal } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function RollingAveragesCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const { last5, lifetime } = rollingAverages(rows)

  return (
    <InsightCard label="Rolling averages" index={index}>
      {last5 === null && lifetime === null ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/40">Last 5 fills</p>
            <p className="text-2xl font-semibold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatDecimal(last5)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">Lifetime</p>
            <p className="text-2xl font-semibold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatDecimal(lifetime)}
            </p>
          </div>
          <p className="text-[11px] text-white/35">{L100KM_UNIT}</p>
        </div>
      )}
    </InsightCard>
  )
}
