import { useEffect, useMemo, useState } from 'react'
import { GlassSheet } from '../../components/glass/GlassSheet'
import { GlassChip } from '../../components/glass/GlassChip'
import { NumericField } from '../../components/ui/NumericField'
import { Toggle } from '../../components/ui/Toggle'
import { Button } from '../../components/ui/Button'
import { useCreateFillUp, useUpdateFillUp } from './useFillUps'
import { parseDecimal } from './schema'
import type { EnrichedFillUpRow } from '../../lib/database.types'
import { distancePerTank, previewConsumption } from '../../lib/metrics'
import { resolveFilledAt } from '../../lib/fillUpDate'
import { formatCurrency, formatKm, formatL100km, toDateInputValue } from '../../lib/format'

interface AddFillUpSheetProps {
  open: boolean
  onClose: () => void
  vehicleId: string
  tankCapacityL: number | null
  rows: EnrichedFillUpRow[]
  recentStations: string[]
  /** When set the sheet edits this fill-up instead of adding a new one. Mount with a
   * `key` that changes per fill-up so the form re-initialises. */
  editing?: EnrichedFillUpRow | null
}

type NumericKey = 'litres' | 'cost' | 'price'

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]'

const trimNumber = (n: number) => String(Number(n.toFixed(2)))

export function AddFillUpSheet({ open, onClose, vehicleId, tankCapacityL, rows, recentStations, editing = null }: AddFillUpSheetProps) {
  const isEdit = editing !== null

  // Rows the form validates against: everything except the fill-up being edited.
  const others = useMemo(() => rows.filter((r) => r.id !== editing?.id), [rows, editing])
  const lastFillUp = others[others.length - 1] ?? null
  const avgDistance = distancePerTank(rows)?.average ?? null
  const suggestedOdometer = lastFillUp !== null ? String(Math.round(lastFillUp.odometer_km + (avgDistance ?? 0))) : ''

  // Odometer must stay between the neighbours so the stored order (and every measured
  // tank) is preserved.
  const lowerBoundKm = isEdit
    ? (others.filter((r) => r.odometer_km < editing.odometer_km).at(-1)?.odometer_km ?? null)
    : (lastFillUp?.odometer_km ?? null)
  const upperBoundKm = isEdit ? (others.find((r) => r.odometer_km > editing.odometer_km)?.odometer_km ?? null) : null

  const today = toDateInputValue(new Date())
  const yesterday = toDateInputValue(new Date(Date.now() - 86_400_000))

  const [odometer, setOdometer] = useState(editing ? trimNumber(editing.odometer_km) : suggestedOdometer)
  const [litres, setLitres] = useState(editing ? trimNumber(editing.litres) : '')
  const [cost, setCost] = useState(editing ? trimNumber(editing.total_cost) : '')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(editing ? toDateInputValue(new Date(editing.filled_at)) : today)
  const [computerL100km, setComputerL100km] = useState(editing?.computer_l_per_100km != null ? String(editing.computer_l_per_100km) : '')
  const [rangeEstimate, setRangeEstimate] = useState(editing?.range_estimate_km != null ? String(editing.range_estimate_km) : '')
  const [isFullTank, setIsFullTank] = useState(editing?.is_full_tank ?? true)
  const [missedPrevious, setMissedPrevious] = useState(editing?.missed_previous ?? false)
  const [station, setStation] = useState(editing?.station ?? lastFillUp?.station ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [moreOpen, setMoreOpen] = useState(Boolean(editing?.computer_l_per_100km || editing?.range_estimate_km || editing?.notes))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createFillUp = useCreateFillUp(vehicleId)
  const updateFillUp = useUpdateFillUp(vehicleId)
  const saving = createFillUp.isPending || updateFillUp.isPending

  // A fresh "add" sheet should open on the up-to-date suggestion, not a stale one.
  useEffect(() => {
    if (open && !isEdit) {
      setOdometer(suggestedOdometer)
      setDate(toDateInputValue(new Date()))
      setStation((s) => s || (lastFillUp?.station ?? ''))
    }
    if (open) setSubmitError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filled: Record<NumericKey, string> = { litres, cost, price }
  const filledCount = Object.values(filled).filter((v) => v !== '').length
  const emptyKey = (Object.keys(filled) as NumericKey[]).find((k) => filled[k] === '') ?? null
  const computedField: NumericKey | null = filledCount === 2 ? emptyKey : null

  const litresNum = parseDecimal(litres)
  const costNum = parseDecimal(cost)
  const priceNum = parseDecimal(price)

  const derived = useMemo(() => {
    if (computedField === 'litres' && costNum !== null && priceNum !== null && priceNum !== 0) {
      return { litres: costNum / priceNum }
    }
    if (computedField === 'cost' && litresNum !== null && priceNum !== null) {
      return { cost: litresNum * priceNum }
    }
    if (computedField === 'price' && litresNum !== null && costNum !== null && litresNum !== 0) {
      return { price: costNum / litresNum }
    }
    return {}
  }, [computedField, litresNum, costNum, priceNum])

  const finalLitres = computedField === 'litres' ? (derived.litres ?? null) : litresNum
  const finalCost = computedField === 'cost' ? (derived.cost ?? null) : costNum

  const odometerNum = parseDecimal(odometer)

  const odometerError =
    odometerNum === null
      ? null
      : lowerBoundKm !== null && odometerNum <= lowerBoundKm
        ? `Must be greater than the previous reading (${formatKm(lowerBoundKm)}).`
        : upperBoundKm !== null && odometerNum >= upperBoundKm
          ? `Must be less than the next reading (${formatKm(upperBoundKm)}).`
          : null

  const filledAt = resolveFilledAt({ date, now: new Date(), existing: editing?.filled_at })
  const dateError = filledAt === null ? 'Pick a valid date that is not in the future.' : null
  const dateWarning =
    filledAt !== null && lastFillUp !== null && !isEdit && toDateInputValue(new Date(filledAt)) < toDateInputValue(new Date(lastFillUp.filled_at))
      ? 'That is earlier than your last fill-up. Check the date.'
      : null

  const tankWarning =
    finalLitres !== null && tankCapacityL !== null && finalLitres > tankCapacityL * 1.05
      ? `That's more than your ${tankCapacityL}L tank should hold.`
      : null

  // Same full-to-full rule as the stored data — never a figure from an unmeasurable span.
  const previewL100km =
    odometerNum !== null && odometerError === null && finalLitres !== null && finalLitres > 0
      ? previewConsumption(
          rows,
          { odometer_km: odometerNum, litres: finalLitres, is_full_tank: isFullTank, missed_previous: missedPrevious },
          editing?.id,
        )
      : null

  const consumptionWarning =
    previewL100km !== null && (previewL100km < 2 || previewL100km > 30)
      ? `${previewL100km.toFixed(1)} L/100km looks unusual. Double-check the numbers.`
      : null

  const canSubmit =
    odometerNum !== null &&
    odometerError === null &&
    dateError === null &&
    finalLitres !== null &&
    finalLitres > 0 &&
    finalCost !== null &&
    finalCost >= 0

  function reset() {
    setOdometer(suggestedOdometer)
    setLitres('')
    setCost('')
    setPrice('')
    setDate(toDateInputValue(new Date()))
    setComputerL100km('')
    setRangeEstimate('')
    setIsFullTank(true)
    setMissedPrevious(false)
    setNotes('')
    setMoreOpen(false)
    setSubmitError(null)
  }

  async function handleSubmit() {
    if (!canSubmit || odometerNum === null || finalLitres === null || finalCost === null || filledAt === null) return
    setSubmitError(null)
    const fields = {
      odometer_km: odometerNum,
      litres: finalLitres,
      total_cost: finalCost,
      computer_l_per_100km: parseDecimal(computerL100km),
      range_estimate_km: parseDecimal(rangeEstimate),
      is_full_tank: isFullTank,
      missed_previous: missedPrevious,
      filled_at: filledAt,
      station: station.trim() || null,
      fuel_grade: editing?.fuel_grade ?? null,
      notes: notes.trim() || null,
    }
    try {
      if (editing) await updateFillUp.mutateAsync({ id: editing.id, ...fields })
      else await createFillUp.mutateAsync(fields)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save the fill-up.')
      return
    }
    if (!isEdit) reset()
    onClose()
  }

  return (
    <GlassSheet open={open} onClose={onClose} title={isEdit ? 'Edit fill-up' : 'Add fill-up'}>
      <div className="space-y-5">
        <NumericField label="Odometer" suffix="km" value={odometer} onChange={setOdometer} error={odometerError ?? undefined} />

        <div className="grid grid-cols-3 gap-3">
          <NumericField
            label="Litres"
            value={computedField === 'litres' ? (derived.litres?.toFixed(2) ?? '') : litres}
            onChange={setLitres}
            disabled={computedField === 'litres'}
            className={computedField === 'litres' ? 'opacity-50' : ''}
          />
          <NumericField
            label="Total cost"
            suffix="R"
            value={computedField === 'cost' ? (derived.cost?.toFixed(2) ?? '') : cost}
            onChange={setCost}
            disabled={computedField === 'cost'}
            className={computedField === 'cost' ? 'opacity-50' : ''}
          />
          <NumericField
            label="R / litre"
            value={computedField === 'price' ? (derived.price?.toFixed(2) ?? '') : price}
            onChange={setPrice}
            disabled={computedField === 'price'}
            className={computedField === 'price' ? 'opacity-50' : ''}
          />
        </div>
        {finalCost !== null && filledCount < 2 && (
          <p className="-mt-3 text-xs text-white/40">Enter any two of litres, total cost, or price per litre.</p>
        )}
        {tankWarning && <p className="-mt-3 text-xs text-[--color-warn]">{tankWarning}</p>}
        {consumptionWarning && <p className="-mt-3 text-xs text-[--color-warn]">{consumptionWarning}</p>}

        <div className="flex flex-wrap gap-2">
          <Toggle label="Full tank" active={isFullTank} onChange={setIsFullTank} />
          <Toggle label="Missed previous" active={missedPrevious} onChange={setMissedPrevious} />
        </div>

        <p className="-mt-2 text-xs text-white/40">
          {previewL100km !== null
            ? `Measures ${formatL100km(previewL100km)} over this tank.`
            : isFullTank
              ? 'No measurement yet: needs an earlier full tank and no missed fill in between.'
              : 'Partial top-up: counted in your next full tank.'}
        </p>

        <div>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Date</span>
          <div className="flex flex-wrap items-center gap-2">
            <GlassChip active={date === today} onClick={() => setDate(today)}>
              Today
            </GlassChip>
            <GlassChip active={date === yesterday} onClick={() => setDate(yesterday)}>
              Yesterday
            </GlassChip>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Fill-up date"
              className={`${fieldClass} min-h-11 w-auto flex-1 [color-scheme:dark]`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
          {dateError && <p className="mt-1 text-xs text-[--color-bad]">{dateError}</p>}
          {!dateError && dateWarning && <p className="mt-1 text-xs text-[--color-warn]">{dateWarning}</p>}
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Station</span>
          <div className="flex flex-wrap gap-2">
            {recentStations.map((s) => (
              <GlassChip key={s} active={station === s} onClick={() => setStation(s)}>
                {s}
              </GlassChip>
            ))}
          </div>
          <input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Station name" className={`${fieldClass} mt-2`} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className="flex min-h-11 w-full items-center justify-between text-sm text-white/60"
          >
            <span>More details (dash readings, notes)</span>
            <span aria-hidden>{moreOpen ? '−' : '+'}</span>
          </button>
          {moreOpen && (
            <div className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumericField label="Dash L/100km" value={computerL100km} onChange={setComputerL100km} placeholder="optional" />
                <NumericField label="Range shown" suffix="km" value={rangeEstimate} onChange={setRangeEstimate} placeholder="optional" />
              </div>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={fieldClass} />
            </div>
          )}
        </div>

        {finalCost !== null && <p className="text-center text-sm text-white/50">Saving {formatCurrency(finalCost)}</p>}

        {!navigator.onLine && !isEdit && (
          <p className="text-center text-xs text-[--color-warn]">
            You're offline. This will be kept on your phone and sent when you're back online.
          </p>
        )}
        {submitError && (
          <p role="alert" className="rounded-2xl border border-[--color-bad]/40 bg-[--color-bad]/10 px-4 py-3 text-sm text-[--color-bad]">
            {submitError}
          </p>
        )}

        {/* Pinned to the bottom of the scrolling sheet so Save is always reachable
            with one thumb, however long the form gets. */}
        <div
          className="sticky bottom-0 -mx-6 -mb-6 px-6 pb-6 pt-4"
          style={{ background: 'linear-gradient(to top, var(--color-bg-elevated) 70%, transparent)' }}
        >
          <Button className="w-full" disabled={!canSubmit || saving} onClick={handleSubmit}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save fill-up'}
          </Button>
        </div>
      </div>
    </GlassSheet>
  )
}
