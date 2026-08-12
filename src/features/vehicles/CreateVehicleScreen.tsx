import { useState, type FormEvent } from 'react'
import { GlassCard } from '../../components/glass/GlassCard'
import { Button } from '../../components/ui/Button'
import { NumericField } from '../../components/ui/NumericField'
import { GlassChip } from '../../components/glass/GlassChip'
import { useCreateVehicle } from './useVehicles'
import type { FuelType, PriceZone } from '../../lib/database.types'

const FUEL_TYPES: Array<{ value: FuelType; label: string }> = [
  { value: '95', label: '95 ULP' },
  { value: '93', label: '93 ULP' },
  { value: 'diesel-50', label: 'Diesel 50ppm' },
  { value: 'diesel-500', label: 'Diesel 500ppm' },
]

/** Shown once, before Home can render — a fill-up needs a vehicle to belong to. */
export function CreateVehicleScreen() {
  const [name, setName] = useState('')
  const [fuelType, setFuelType] = useState<FuelType>('95')
  const [priceZone, setPriceZone] = useState<PriceZone>('inland')
  const [tankCapacity, setTankCapacity] = useState('')
  const createVehicle = useCreateVehicle()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createVehicle.mutate({
      name: name.trim(),
      fuelType,
      priceZone,
      tankCapacityL: tankCapacity ? Number(tankCapacity) : null,
    })
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Your vehicle</h1>
        <p className="mt-1 text-sm text-white/60">One more thing before your first fill-up.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Name</span>
            <input
              autoFocus
              required
              placeholder="e.g. Polo Vivo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Fuel</span>
            <div className="flex flex-wrap gap-2">
              {FUEL_TYPES.map((f) => (
                <GlassChip key={f.value} active={fuelType === f.value} onClick={() => setFuelType(f.value)}>
                  {f.label}
                </GlassChip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">
              Price zone
            </span>
            <div className="flex gap-2">
              <GlassChip active={priceZone === 'inland'} onClick={() => setPriceZone('inland')}>
                Inland
              </GlassChip>
              <GlassChip active={priceZone === 'coastal'} onClick={() => setPriceZone('coastal')}>
                Coastal
              </GlassChip>
            </div>
          </div>

          <NumericField
            label="Tank capacity"
            suffix="L"
            value={tankCapacity}
            onChange={setTankCapacity}
            placeholder="optional"
          />

          <Button type="submit" disabled={createVehicle.isPending || !name.trim()} className="w-full">
            {createVehicle.isPending ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
