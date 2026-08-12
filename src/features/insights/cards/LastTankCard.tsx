import { InsightCard, EmptyState } from '../InsightCard'
import { CountUpNumber } from '../../../components/ui/CountUpNumber'
import { lastTankSummary } from '../../../lib/metrics'
import { formatPercent } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

const ARROW = { better: '↓', worse: '↑', flat: '→' } as const
const COLOR = { better: 'text-[--color-good]', worse: 'text-[--color-bad]', flat: 'text-white/50' } as const

export function LastTankCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const summary = lastTankSummary(rows)

  return (
    <InsightCard label="Last tank" index={index}>
      {summary === null ? (
        <EmptyState />
      ) : (
        <div className="flex items-baseline gap-3">
          <CountUpNumber value={summary.actualL100km} decimals={2} className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-white" />
          <span className="text-sm text-white/50">L/100km</span>
          {summary.direction && (
            <span className={`ml-auto flex items-center gap-1 text-sm font-medium ${COLOR[summary.direction]}`}>
              {ARROW[summary.direction]} {formatPercent((summary.deltaVsRolling5! / summary.actualL100km) * 100)}
            </span>
          )}
        </div>
      )}
    </InsightCard>
  )
}
