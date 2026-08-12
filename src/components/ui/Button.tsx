import { motion, type HTMLMotionProps } from 'motion/react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
}

const variantClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white glass-chip',
  ghost: 'text-white/60',
}

export function Button({ variant = 'primary', className = '', style, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      disabled={disabled}
      className={`min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-40 ${variantClass[variant]} ${className}`}
      style={
        variant === 'primary'
          ? { background: 'color-mix(in oklch, var(--color-accent) 70%, white 0%)', ...style }
          : style
      }
      {...props}
    />
  )
}
