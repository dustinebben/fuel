import { useScroll, useTransform, motion } from 'motion/react'
import { usePendingCount } from '../features/fillups/useFillUps'
import { formatKm } from '../lib/format'
import type { VehicleRow } from '../lib/database.types'

// Header glass intensifies from blur(0) to blur(26px) over the first 60px of scroll,
// driven by useScroll/useTransform — never a scroll listener calling setState.
export function Header({ vehicle, latestOdometerKm }: { vehicle: VehicleRow | null; latestOdometerKm: number | null }) {
  const { scrollY } = useScroll()
  const blur = useTransform(scrollY, [0, 60], [0, 26])
  const blurFilter = useTransform(blur, (b) => `blur(${b}px) saturate(180%)`)
  const { data: pending = 0 } = usePendingCount()

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pb-3"
      style={{
        backdropFilter: blurFilter,
        WebkitBackdropFilter: blurFilter,
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
      }}
    >
      <div>
        <p className="text-sm font-semibold text-white">{vehicle?.name ?? 'Fuel'}</p>
        {latestOdometerKm !== null && <p className="text-xs text-white/40">{formatKm(latestOdometerKm)}</p>}
      </div>
      {pending > 0 && (
        <span className="glass-chip px-3 py-1.5 text-xs font-medium text-white/70">
          {pending} pending
        </span>
      )}
    </motion.header>
  )
}
