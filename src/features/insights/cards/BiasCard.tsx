import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { InsightCard, EmptyState } from '../InsightCard'
import { averageTripComputerBias, tripComputerBiasSeries } from '../../../lib/metrics'
import { formatPercent } from '../../../lib/format'
import type { EnrichedFillUpRow } from '../../../lib/database.types'

export function BiasCard({ rows, index }: { rows: EnrichedFillUpRow[]; index?: number }) {
  const avgBias = averageTripComputerBias(rows)
  const series = tripComputerBiasSeries(rows)

  return (
    <InsightCard label="Car vs reality" index={index} className="col-span-2">
      {avgBias === null ? (
        <EmptyState message="Log your dash's L/100km reading next fill-up to unlock this." />
      ) : (
        <div>
          <p className="text-sm text-white">
            Your dash reports{' '}
            <span className={`font-semibold ${avgBias < 0 ? 'text-[--color-bad]' : 'text-[--color-good]'}`}>
              {formatPercent(Math.abs(avgBias), { showSign: false })} {avgBias < 0 ? 'better' : 'worse'}
            </span>{' '}
            than reality.
          </p>
          {series.length > 1 && (
            <div className="-mx-2 mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <Line type="monotone" dataKey="claimed" stroke="oklch(1 0 0 / 0.35)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </InsightCard>
  )
}
