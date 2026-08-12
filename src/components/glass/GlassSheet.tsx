import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

const springSheet = { type: 'spring', stiffness: 300, damping: 34 } as const

interface GlassSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

/**
 * Rises from the bottom on a spring; the page behind scales down and dims — the iOS
 * card-stack idiom. Drag-to-dismiss with rubber-band resistance past 40% of the sheet
 * height, velocity-aware snap on release.
 */
export function GlassSheet({ open, onClose, children, title }: GlassSheetProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden"
            style={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: 'var(--radius-sheet)',
              borderTopRightRadius: 'var(--radius-sheet)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="flex shrink-0 justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>
            {title && (
              <div className="flex shrink-0 items-center justify-between px-6 pt-3">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/60"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-6 pb-6 pt-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
