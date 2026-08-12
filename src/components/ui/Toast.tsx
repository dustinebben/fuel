import { AnimatePresence, motion } from 'motion/react'

export interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ToastStack({ toasts }: { toasts: ToastState[] }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass pointer-events-auto flex items-center gap-3 px-4 py-3 text-sm text-white"
          >
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button type="button" onClick={toast.onAction} className="font-semibold text-[--color-accent]">
                {toast.actionLabel}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
