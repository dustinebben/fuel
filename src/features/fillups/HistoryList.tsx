import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GlassCard } from '../../components/glass/GlassCard'
import { Button } from '../../components/ui/Button'
import { ToastStack, type ToastState } from '../../components/ui/Toast'
import { AddFillUpSheet } from './AddFillUpSheet'
import { useDeleteFillUp, useRestoreFillUp } from './useFillUps'
import type { EnrichedFillUpRow, VehicleRow } from '../../lib/database.types'
import { formatCurrency, formatDate, formatKm, formatL100km, formatLitres } from '../../lib/format'

/** Why a row has no measured consumption — always something specific, never blank. */
function unmeasurableReason(row: EnrichedFillUpRow): string | null {
  if (row.actual_l_per_100km !== null) return null
  if (!row.is_full_tank) return 'Partial fill: counted in your next full tank'
  if (row.span_missed) return 'A fill in this stretch was marked missed'
  if (row.span_litres === null) return 'First full tank: nothing to measure from yet'
  if (row.span_distance_km !== null && row.span_distance_km <= 0) return 'Odometer did not increase'
  return 'Not measurable'
}

export function HistoryList({ rows, vehicle }: { rows: EnrichedFillUpRow[]; vehicle: VehicleRow }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EnrichedFillUpRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastState[]>([])

  const deleteFillUp = useDeleteFillUp(vehicle.id)
  const restoreFillUp = useRestoreFillUp(vehicle.id)
  const reversed = useMemo(() => [...rows].reverse(), [rows])

  const recentStations = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) if (r.station) counts.set(r.station, (counts.get(r.station) ?? 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s)
  }, [rows])

  function toast(message: string, action?: { label: string; run: () => void }, ms = 6000) {
    const id = Date.now() + Math.random()
    const dismiss = () => setToasts((t) => t.filter((x) => x.id !== id))
    setToasts((t) => [
      ...t,
      {
        id,
        message,
        actionLabel: action?.label,
        onAction: action
          ? () => {
              dismiss()
              action.run()
            }
          : undefined,
      },
    ])
    setTimeout(dismiss, ms)
  }

  async function handleDelete(row: EnrichedFillUpRow) {
    setConfirmingId(null)
    setExpandedId(null)
    try {
      await deleteFillUp.mutateAsync(row.id)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete the fill-up.')
      return
    }
    toast('Fill-up deleted', {
      label: 'Undo',
      run: () =>
        restoreFillUp.mutate(row, {
          onError: (e) => toast(e instanceof Error ? e.message : 'Could not restore the fill-up.'),
        }),
    })
  }

  if (rows.length === 0) {
    return (
      <GlassCard className="p-6 text-center text-sm text-white/50">No fill-ups yet. Log your first one to get started.</GlassCard>
    )
  }

  return (
    <div className="space-y-2">
      {reversed.map((row, i) => {
        const reason = unmeasurableReason(row)
        const expanded = expandedId === row.id
        const confirming = confirmingId === row.id
        return (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: Math.min(i, 10) * 0.02 }}
          >
            <GlassCard className="p-4">
              {/* Only the summary row is the button: the expanded area holds its own
                  buttons, and nesting interactive elements is invalid and unreadable
                  to screen readers. */}
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => {
                  setExpandedId(expanded ? null : row.id)
                  setConfirmingId(null)
                }}
                className="flex min-h-11 w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(row.filled_at)}</p>
                  <p className="text-xs text-white/50">
                    {row.actual_l_per_100km !== null ? formatL100km(row.actual_l_per_100km) : reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(row.total_cost)}</p>
                  <p className="text-xs text-white/50">
                    {row.price_per_litre !== null ? formatCurrency(row.price_per_litre) + '/L' : '—'}
                  </p>
                </div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden border-t border-white/10 pt-3"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                      <span>Odometer: {formatKm(row.odometer_km)}</span>
                      <span>Litres: {formatLitres(row.litres)}</span>
                      <span>Since previous fill: {formatKm(row.distance_km)}</span>
                      <span>Cost/km: {row.cost_per_km !== null ? formatCurrency(row.cost_per_km) : '—'}</span>
                      {row.span_fills !== null && row.span_fills > 1 && row.span_litres !== null && row.span_distance_km !== null && (
                        <span className="col-span-2">
                          Measured over {row.span_fills} fills: {formatLitres(row.span_litres)} across {formatKm(row.span_distance_km)}
                        </span>
                      )}
                      {row.computer_l_per_100km !== null && <span>Dash: {formatL100km(row.computer_l_per_100km, 1)}</span>}
                      {row.station && <span>Station: {row.station}</span>}
                      {row.notes && <span className="col-span-2">{row.notes}</span>}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => {
                          setEditing(row)
                          setEditOpen(true)
                        }}>
                        Edit
                      </Button>
                      {confirming ? (
                        <Button
                          className="flex-1"
                          style={{ background: 'color-mix(in oklch, var(--color-bad) 70%, black)' }}
                          disabled={deleteFillUp.isPending}
                          onClick={() => handleDelete(row)}
                        >
                          Confirm delete
                        </Button>
                      ) : (
                        <Button variant="ghost" className="flex-1" onClick={() => setConfirmingId(row.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        )
      })}

      <AddFillUpSheet
        key={editing?.id ?? 'none'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vehicleId={vehicle.id}
        tankCapacityL={vehicle.tank_capacity_l}
        rows={rows}
        recentStations={recentStations}
        editing={editing}
      />
      <ToastStack toasts={toasts} />
    </div>
  )
}
