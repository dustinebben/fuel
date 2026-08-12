import { motion } from 'motion/react'

interface ToggleProps {
  label: string
  active: boolean
  onChange: (active: boolean) => void
}

// Presented as a one-tap glass chip rather than a switch — see spec §5: the
// full-tank / missed-previous flags must be visible without scrolling, never
// buried behind an accordion.
export function Toggle({ label, active, onChange }: ToggleProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      whileTap={{ scale: 0.96, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      className="glass-chip flex min-h-11 items-center gap-2 px-4 text-sm font-medium"
      style={{
        background: active ? 'color-mix(in oklch, var(--color-accent) 35%, var(--glass-tint-strong))' : undefined,
        color: active ? 'white' : 'oklch(1 0 0 / 0.6)',
      }}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
        style={{ background: active ? 'white' : 'transparent', border: active ? 'none' : '1.5px solid oklch(1 0 0 / 0.35)' }}
      >
        {active && <span style={{ color: 'var(--color-accent)' }}>✓</span>}
      </span>
      {label}
    </motion.button>
  )
}
