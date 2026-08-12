import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { InsightCard, EmptyState } from '../InsightCard'
import { trendSeries } from '../../../lib/metrics'
import { formatDate, formatL100km } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { filledAt: string; actualL100km: number } }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="glass-chip px-3 py-2 text-xs text-white">
      <p className="text-white/50">{formatDate(point.filledAt)}</p>
      <p className="font-semibold">{formatL100km(point.actualL100km)}</p>
    </div>
  )
}

export function TrendChartCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const series = trendSeries(rows)

  return (
    <InsightCard label="Consumption trend" index={index} className="col-span-2">
      {series.length < 2 ? (
        <EmptyState message="A couple more fill-ups and the trend line comes alive." />
      ) : (
        <div className="-mx-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="filledAt" hide />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="actualL100km"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="url(#trendFill)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--color-accent)', stroke: 'white', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="rollingAvg"
                stroke="oklch(1 0 0 / 0.35)"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </InsightCard>
  )
}
