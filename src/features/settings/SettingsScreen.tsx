import { useState } from 'react'
import { GlassCard } from '../../components/glass/GlassCard'
import { GlassChip } from '../../components/glass/GlassChip'
import { NumericField } from '../../components/ui/NumericField'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { supabase } from '../../lib/supabase'
import { downloadCsv } from '../../lib/csv'
import { useUpdateVehicle } from '../vehicles/useVehicles'
import type { EnrichedFillUpRow, FuelType, PriceZone, VehicleRow } from '../../lib/database.types'

const FUEL_TYPES: Array<{ value: FuelType; label: string }> = [
  { value: '95', label: '95 ULP' },
  { value: '93', label: '93 ULP' },
  { value: 'diesel-50', label: 'Diesel 50ppm' },
  { value: 'diesel-500', label: 'Diesel 500ppm' },
]

export function SettingsScreen({
  vehicle,
  rows,
  motionEnabled,
  onMotionEnabledChange,
}: {
  vehicle: VehicleRow | null
  rows: EnrichedFillUpRow[]
  motionEnabled: boolean
  onMotionEnabledChange: (enabled: boolean) => void
}) {
  const updateVehicle = useUpdateVehicle()
  const [tankCapacity, setTankCapacity] = useState(vehicle?.tank_capacity_l?.toString() ?? '')

  if (!vehicle) return null

  async function requestMotionAccess() {
    const AnyDeviceOrientationEvent = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof AnyDeviceOrientationEvent.requestPermission === 'function') {
      const result = await AnyDeviceOrientationEvent.requestPermission()
      onMotionEnabledChange(result === 'granted')
    } else {
      onMotionEnabledChange(true)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-32 pt-6" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Settings</h1>

      <GlassCard className="space-y-4 p-5" index={0}>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Vehicle</p>
        <input
          defaultValue={vehicle.name}
          onBlur={(e) => e.target.value !== vehicle.name && updateVehicle.mutate({ id: vehicle.id, name: e.target.value })}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
        />

        <div className="flex flex-wrap gap-2">
          {FUEL_TYPES.map((f) => (
            <GlassChip
              key={f.value}
              active={vehicle.fuel_type === f.value}
              onClick={() => updateVehicle.mutate({ id: vehicle.id, fuel_type: f.value })}
            >
              {f.label}
            </GlassChip>
          ))}
        </div>

        <div className="flex gap-2">
          {(['inland', 'coastal'] as PriceZone[]).map((zone) => (
            <GlassChip
              key={zone}
              active={vehicle.price_zone === zone}
              onClick={() => updateVehicle.mutate({ id: vehicle.id, price_zone: zone })}
            >
              {zone === 'inland' ? 'Inland' : 'Coastal'}
            </GlassChip>
          ))}
        </div>

        <NumericField
          label="Tank capacity"
          suffix="L"
          value={tankCapacity}
          onChange={setTankCapacity}
          onBlur={() => {
            const n = Number(tankCapacity)
            if (Number.isFinite(n) && n !== vehicle.tank_capacity_l) {
              updateVehicle.mutate({ id: vehicle.id, tank_capacity_l: n || null })
            }
          }}
        />
      </GlassCard>

      <GlassCard className="p-5" index={1}>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Motion effects</p>
        <p className="mt-1 text-sm text-white/50">
          Tilt-reactive specular highlight on the hero card. Optional garnish — the app is complete without it.
        </p>
        <div className="mt-3">
          <Toggle
            label={motionEnabled ? 'Enabled' : 'Enable'}
            active={motionEnabled}
            onChange={(enabled) => (enabled ? requestMotionAccess() : onMotionEnabledChange(false))}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-5" index={2}>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">Export</p>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => downloadCsv(rows, `${vehicle.name}-fuel-export.csv`)}>
          Export CSV
        </Button>
      </GlassCard>

      <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  )
}
