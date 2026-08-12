import { HistoryList } from './HistoryList'
import type { EnrichedFillUpRow } from '../../lib/database.types'

export function HistoryScreen({ rows, vehicleId }: { rows: EnrichedFillUpRow[]; vehicleId: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-white">History</h1>
      <HistoryList rows={rows} vehicleId={vehicleId} />
    </div>
  )
}
