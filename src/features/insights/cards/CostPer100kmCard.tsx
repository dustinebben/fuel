import { InsightCard, EmptyState } from '../InsightCard'
import { CountUpNumber } from '../../../components/ui/CountUpNumber'
import { costPer100km } from '../../../lib/metrics'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function CostPer100kmCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const chrono = [...rows].sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime())
  const latest = chrono[chrono.length - 1]
  const value = latest ? costPer100km(latest) : null

  return (
    <InsightCard label="Cost per 100 km" index={index}>
      {value === null ? (
        <EmptyState />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-white/50">R</span>
          <CountUpNumber value={value} decimals={2} className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-white" />
        </div>
      )}
    </InsightCard>
  )
}
