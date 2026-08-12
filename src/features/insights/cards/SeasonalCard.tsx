import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
import { InsightCard, EmptyState } from '../InsightCard'
import { seasonalSplit } from '../../../lib/metrics'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function SeasonalCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const split = seasonalSplit(rows)

  return (
    <InsightCard label="Seasonal split" index={index} className="col-span-2">
      {split === null ? (
        <EmptyState message="Needs 12+ months of history — keep logging." />
      ) : (
        <div className="-mx-2 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={split.map((s) => ({ ...s, label: MONTH_LABELS[s.month] }))}>
              <XAxis dataKey="label" tick={{ fill: 'oklch(1 0 0 / 0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Bar dataKey="avgL100km" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </InsightCard>
  )
}
