import { Bar, BarChart, ResponsiveContainer } from 'recharts'
import { InsightCard, EmptyState } from '../InsightCard'
import { spendSummary } from '../../../lib/metrics'
import { formatCurrency } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function SpendCard({ rows, index, className }: { rows: EnrichedFillUpRow[]; index?: number; className?: string }) {
  if (rows.length === 0) {
    return (
      <InsightCard label="Spend" index={index} className={className}>
        <EmptyState />
      </InsightCard>
    )
  }

  const { thisMonth, thisYear, monthlySparkline } = spendSummary(rows)

  return (
    <InsightCard label="Spend" index={index} className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/40">This month</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(thisMonth)}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">This year</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(thisYear)}</p>
        </div>
      </div>
      {monthlySparkline.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySparkline}>
              <Bar dataKey="total" fill="oklch(1 0 0 / 0.25)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </InsightCard>
  )
}
