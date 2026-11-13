import { useEffect, useState } from 'react'
import { GlassTabBar, type TabKey } from '../components/glass/GlassTabBar'
import { CreateVehicleScreen } from '../features/vehicles/CreateVehicleScreen'
import { useDefaultVehicle } from '../features/vehicles/useVehicles'
import { useEnrichedFillUps, useOfflineSync } from '../features/fillups/useFillUps'
import { HomeScreen } from './HomeScreen'
import { HistoryScreen } from '../features/fillups/HistoryScreen'
import { InsightsScreen } from '../features/insights/InsightsScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { useTiltHighlight } from '../lib/useTiltHighlight'
import { LoadingSkeleton } from './LoadingSkeleton'

const MOTION_PREF_KEY = 'fuel:motion-effects-enabled'

/** Every screen needs its own back affordance — a standalone PWA has no back button.
 * Here that's simply the persistent tab bar; there is no screen this app can strand
 * you on. */
export function AppShell() {
  const [tab, setTab] = useState<TabKey>('home')
  const [motionEnabled, setMotionEnabled] = useState(() => localStorage.getItem(MOTION_PREF_KEY) === 'true')
  const { vehicle, isLoading: vehicleLoading } = useDefaultVehicle()
  const { data: rows = [], isLoading: fillUpsLoading } = useEnrichedFillUps(vehicle?.id ?? null)

  useOfflineSync()
  useTiltHighlight(motionEnabled)

  useEffect(() => {
    localStorage.setItem(MOTION_PREF_KEY, String(motionEnabled))
  }, [motionEnabled])

  if (vehicleLoading) {
    return <LoadingSkeleton />
  }

  if (!vehicle) {
    return <CreateVehicleScreen />
  }

  if (fillUpsLoading) {
    return <LoadingSkeleton />
  }

  return (
    <>
      {tab === 'home' && <HomeScreen vehicle={vehicle} rows={rows} />}
      {tab === 'history' && <HistoryScreen rows={rows} vehicle={vehicle} />}
      {tab === 'insights' && <InsightsScreen rows={rows} vehicle={vehicle} />}
      {tab === 'settings' && (
        <SettingsScreen vehicle={vehicle} rows={rows} motionEnabled={motionEnabled} onMotionEnabledChange={setMotionEnabled} />
      )}
      <GlassTabBar active={tab} onChange={setTab} />
    </>
  )
}
