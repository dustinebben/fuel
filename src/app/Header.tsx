import { useState } from 'react'
import { useScroll, useTransform, motion } from 'motion/react'
import { usePendingCount, useQueuedFillUps } from '../features/fillups/useFillUps'
import { QueueSheet } from '../features/fillups/QueueSheet'
import { formatKm } from '../lib/format'
import type { VehicleRow } from '../lib/database.types'

// The header's glass fades in over the first 60px of scroll. The blur itself is static;
// only its layer's opacity animates (CLAUDE.md: never animate backdrop-filter), driven by
// useScroll/useTransform rather than a scroll listener calling setState.
export function Header({ vehicle, latestOdometerKm }: { vehicle: VehicleRow | null; latestOdometerKm: number | null }) {
  const { scrollY } = useScroll()
  const glassOpacity = useTransform(scrollY, [0, 60], [0, 1])
  const { data: pending = 0 } = usePendingCount()
  const { data: queued = [] } = useQueuedFillUps()
  const [queueOpen, setQueueOpen] = useState(false)
  const failed = queued.filter((q) => q.lastError).length

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pb-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: glassOpacity,
            backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
            maskImage: 'linear-gradient(to bottom, black 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)',
          }}
        />
        <div className="relative">
          <p className="text-sm font-semibold text-white">{vehicle?.name ?? 'Fuel'}</p>
          {latestOdometerKm !== null && <p className="text-xs text-white/40">{formatKm(latestOdometerKm)}</p>}
        </div>
        {pending > 0 && (
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className={`glass-chip relative flex min-h-11 items-center px-4 text-xs font-medium ${failed > 0 ? 'text-[--color-bad]' : 'text-white/70'}`}
          >
            {failed > 0 ? `${failed} need${failed === 1 ? 's' : ''} attention` : `${pending} pending`}
          </button>
        )}
      </header>
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>
  )
}
