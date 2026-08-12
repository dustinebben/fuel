import { useMemo, useState } from 'react'
import { GlassSheet } from '../../components/glass/GlassSheet'
import { GlassChip } from '../../components/glass/GlassChip'
import { NumericField } from '../../components/ui/NumericField'
import { Toggle } from '../../components/ui/Toggle'
import { Button } from '../../components/ui/Button'
import { useCreateFillUp } from './useFillUps'
import { parseDecimal } from './schema'
import type { EnrichedFillUpRow } from '../../lib/database.types'
import { distancePerTank } from '../../lib/metrics'
import { formatCurrency } from '../../lib/format'

interface AddFillUpSheetProps {
  open: boolean
  onClose: () => void
  vehicleId: string
  tankCapacityL: number | null
  rows: EnrichedFillUpRow[]
  recentStations: string[]
}

type NumericKey = 'litres' | 'cost' | 'price'

export function AddFillUpSheet({ open, onClose, vehicleId, tankCapacityL, rows, recentStations }: AddFillUpSheetProps) {
  const lastFillUp = rows[rows.length - 1] ?? null
  const avgDistance = distancePerTank(rows)?.average ?? null
  const suggestedOdometer =
    lastFillUp !== null ? String(Math.round(lastFillUp.odometer_km + (avgDistance ?? 0))) : ''

  const [odometer, setOdometer] = useState(suggestedOdometer)
  const [litres, setLitres] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [computerL100km, setComputerL100km] = useState('')
  const [rangeEstimate, setRangeEstimate] = useState('')
  const [isFullTank, setIsFullTank] = useState(true)
  const [missedPrevious, setMissedPrevious] = useState(false)
  const [station, setStation] = useState('')
  const [notes, setNotes] = useState('')

  const createFillUp = useCreateFillUp(vehicleId)

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
  const distanceSincePrev =
    lastFillUp !== null && odometerNum !== null ? odometerNum - lastFillUp.odometer_km : null

  const odometerError =
    lastFillUp !== null && odometerNum !== null && odometerNum <= lastFillUp.odometer_km
      ? `Must be greater than the last reading (${lastFillUp.odometer_km.toLocaleString('en-ZA')} km).`
      : null

  const tankWarning =
    finalLitres !== null && tankCapacityL !== null && finalLitres > tankCapacityL * 1.05
      ? `That's more than your ${tankCapacityL}L tank should hold.`
      : null

  const impliedL100km =
    finalLitres !== null && distanceSincePrev !== null && distanceSincePrev > 0
      ? (finalLitres * 100) / distanceSincePrev
      : null

  const consumptionWarning =
    impliedL100km !== null && (impliedL100km < 2 || impliedL100km > 30)
      ? `${impliedL100km.toFixed(1)} L/100km looks unusual — double check the numbers.`
      : null

  const canSubmit =
    odometerNum !== null &&
    odometerError === null &&
    finalLitres !== null &&
    finalLitres > 0 &&
    finalCost !== null &&
    finalCost >= 0

  function reset() {
    setOdometer(suggestedOdometer)
    setLitres('')
    setCost('')
    setPrice('')
    setComputerL100km('')
    setRangeEstimate('')
    setIsFullTank(true)
    setMissedPrevious(false)
    setStation('')
    setNotes('')
  }

  async function handleSubmit() {
    if (!canSubmit || odometerNum === null || finalLitres === null || finalCost === null) return
    await createFillUp.mutateAsync({
      odometer_km: odometerNum,
      litres: finalLitres,
      total_cost: finalCost,
      computer_l_per_100km: parseDecimal(computerL100km),
      range_estimate_km: parseDecimal(rangeEstimate),
      is_full_tank: isFullTank,
      missed_previous: missedPrevious,
      filled_at: new Date().toISOString(),
      station: station.trim() || null,
      fuel_grade: null,
      notes: notes.trim() || null,
    })
    reset()
    onClose()
  }

  return (
    <GlassSheet open={open} onClose={onClose} title="Add fill-up">
      <div className="space-y-5">
        <NumericField
          label="Odometer"
          suffix="km"
          value={odometer}
          onChange={setOdometer}
          error={odometerError ?? undefined}
        />

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

        <div className="grid grid-cols-2 gap-3">
          <NumericField label="Dash L/100km" value={computerL100km} onChange={setComputerL100km} placeholder="optional" />
          <NumericField label="Range shown" suffix="km" value={rangeEstimate} onChange={setRangeEstimate} placeholder="optional" />
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">
            Station
          </span>
          <div className="flex flex-wrap gap-2">
            {recentStations.map((s) => (
              <GlassChip key={s} active={station === s} onClick={() => setStation(s)}>
                {s}
              </GlassChip>
            ))}
          </div>
          <input
            value={station}
            onChange={(e) => setStation(e.target.value)}
            placeholder="Station name"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
          />
        </div>

        {finalCost !== null && (
          <p className="text-center text-sm text-white/50">Saving {formatCurrency(finalCost)}</p>
        )}

        <Button className="w-full" disabled={!canSubmit || createFillUp.isPending} onClick={handleSubmit}>
          {createFillUp.isPending ? 'Saving…' : 'Save fill-up'}
        </Button>
      </div>
    </GlassSheet>
  )
}
