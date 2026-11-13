import { useQueryClient } from '@tanstack/react-query'
import { GlassSheet } from '../../components/glass/GlassSheet'
import { Button } from '../../components/ui/Button'
import { discardQueuedFillUp, retryQueuedFillUp, useQueuedFillUps } from './useFillUps'
import { formatCurrency, formatDate, formatKm, formatLitres } from '../../lib/format'

/** Fill-ups saved on this phone that haven't reached the server yet — either waiting for
 * a connection, or refused by the server (with the reason) and waiting on a decision. */
export function QueueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useQueuedFillUps()

  return (
    <GlassSheet open={open} onClose={onClose} title="Waiting to sync">
      {items.length === 0 ? (
        <p className="text-sm text-white/50">Everything has synced.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.localId} className="glass-chip space-y-2 p-4">
              <div className="flex items-baseline justify-between text-sm text-white">
                <span className="font-medium">{formatDate(item.payload.filled_at)}</span>
                <span className="font-semibold">{formatCurrency(item.payload.total_cost)}</span>
              </div>
              <p className="text-xs text-white/50">
                {formatKm(item.payload.odometer_km)} · {formatLitres(item.payload.litres)}
              </p>
              <p className={`text-xs ${item.lastError ? 'text-[--color-bad]' : 'text-white/40'}`}>
                {item.lastError ?? 'Waiting for a connection…'}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => void retryQueuedFillUp(queryClient, item.localId)}>
                  Retry now
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => void discardQueuedFillUp(queryClient, item.localId)}>
                  Discard
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassSheet>
  )
}
