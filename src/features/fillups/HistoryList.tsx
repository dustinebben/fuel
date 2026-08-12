import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GlassCard } from '../../components/glass/GlassCard'
import type { EnrichedFillUpRow } from '../../lib/database.types'
import { formatCurrency, formatDate, formatL100km } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { fillUpsQueryKey } from './useFillUps'
import { ToastStack, type ToastState } from '../../components/ui/Toast'

function unmeasurableReason(row: EnrichedFillUpRow): string | null {
  if (row.actual_l_per_100km !== null) return null
  if (row.prev_odometer_km === null) return 'First fill logged for this vehicle'
  if (row.missed_previous) return 'Marked as a missed previous fill'
  if (!row.is_full_tank) return 'Not a full tank'
  if (!row.prev_is_full) return 'Previous fill was not a full tank'
  if (row.distance_km !== null && row.distance_km <= 0) return 'Odometer did not increase'
  return 'Interval not measurable'
}

export function HistoryList({ rows, vehicleId }: { rows: EnrichedFillUpRow[]; vehicleId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastState[]>([])
  const queryClient = useQueryClient()
  const reversed = [...rows].reverse()

  async function handleDelete(id: string) {
    queryClient.setQueryData<EnrichedFillUpRow[]>(fillUpsQueryKey(vehicleId), (prev) =>
      (prev ?? []).filter((r) => r.id !== id),
    )
    const toastId = Date.now()
    let undone = false
    setToasts((t) => [
      ...t,
      {
        id: toastId,
        message: 'Fill-up deleted',
        actionLabel: 'Undo',
        onAction: () => {
          undone = true
          queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) })
          setToasts((t) => t.filter((x) => x.id !== toastId))
        },
      },
    ])
    setTimeout(async () => {
      setToasts((t) => t.filter((x) => x.id !== toastId))
      if (!undone) await supabase.from('fill_ups').delete().eq('id', id)
    }, 4000)
  }

  if (rows.length === 0) {
    return (
      <GlassCard className="p-6 text-center text-sm text-white/50">
        No fill-ups yet. Log your first one to get started.
      </GlassCard>
    )
  }

  return (
    <div className="space-y-2">
      {reversed.map((row, i) => {
        const reason = unmeasurableReason(row)
        const expanded = expandedId === row.id
        return (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: i * 0.02 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -100) handleDelete(row.id)
            }}
          >
            <GlassCard
              className="p-4"
              onClick={() => setExpandedId(expanded ? null : row.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(row.filled_at)}</p>
                  <p className="text-xs text-white/50">
                    {row.actual_l_per_100km !== null ? formatL100km(row.actual_l_per_100km) : reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(row.total_cost)}</p>
                  <p className="text-xs text-white/50">{row.price_per_litre !== null ? formatCurrency(row.price_per_litre) + '/L' : '—'}</p>
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs text-white/60"
                  >
                    <span>Odometer: {row.odometer_km.toLocaleString('en-ZA')} km</span>
                    <span>Litres: {row.litres.toFixed(2)} L</span>
                    <span>Distance: {row.distance_km ?? '—'} km</span>
                    <span>Cost/km: {row.cost_per_km !== null ? formatCurrency(row.cost_per_km) : '—'}</span>
                    {row.station && <span>Station: {row.station}</span>}
                    {row.notes && <span className="col-span-2">{row.notes}</span>}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        )
      })}
      <ToastStack toasts={toasts} />
    </div>
  )
}
