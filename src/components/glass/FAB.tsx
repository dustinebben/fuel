import { motion } from 'motion/react'

export function FAB({ onClick, label = 'Add fill-up' }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glass fixed bottom-24 right-4 z-30 flex h-16 w-16 items-center justify-center text-3xl"
      style={{
        borderRadius: '9999px',
        background: 'color-mix(in oklch, var(--color-accent) 55%, var(--glass-tint-strong))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      +
    </motion.button>
  )
}
