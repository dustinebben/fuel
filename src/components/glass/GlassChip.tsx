import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface GlassChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  color?: 'accent' | 'good' | 'warn' | 'bad' | 'neutral'
}

const colorClass: Record<NonNullable<GlassChipProps['color']>, string> = {
  accent: 'text-[--color-accent]',
  good: 'text-[--color-good]',
  warn: 'text-[--color-warn]',
  bad: 'text-[--color-bad]',
  neutral: 'text-white/70',
}

export function GlassChip({ children, active = false, onClick, className = '', color = 'neutral' }: GlassChipProps) {
  const interactive = Boolean(onClick)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      whileTap={interactive ? { scale: 0.94, transition: { type: 'spring', stiffness: 400, damping: 30 } } : undefined}
      className={`glass-chip flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium ${
        active ? 'text-white' : colorClass[color]
      } ${className}`}
      style={active ? { background: 'var(--glass-tint-strong)', outline: '1px solid oklch(1 0 0 / 0.3)' } : undefined}
    >
      {children}
    </motion.button>
  )
}
