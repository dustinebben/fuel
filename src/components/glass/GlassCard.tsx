import { motion } from 'motion/react'
import type { ReactNode } from 'react'

const springPress = { type: 'spring', stiffness: 400, damping: 30 } as const
const springEnter = { type: 'spring', stiffness: 260, damping: 26 } as const

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  /** Stagger index for the entrance animation — 0-based position in a list. */
  index?: number
  interactive?: boolean
}

export function GlassCard({ children, className = '', onClick, index = 0, interactive = Boolean(onClick) }: GlassCardProps) {
  const Component = interactive ? motion.button : motion.div

  return (
    <Component
      className={`glass ${className}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springEnter, delay: index * 0.04 }}
      whileTap={interactive ? { scale: 0.97, transition: springPress } : undefined}
    >
      {children}
    </Component>
  )
}
