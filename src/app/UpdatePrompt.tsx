import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'motion/react'

// A non-intrusive glass chip, never a reload forced under the user — see spec §10.
export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.button
          type="button"
          onClick={() => updateServiceWorker(true)}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-chip fixed inset-x-0 top-4 z-50 mx-auto w-fit px-4 py-2 text-xs font-medium text-white"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          Update available — tap to refresh
        </motion.button>
      )}
    </AnimatePresence>
  )
}
