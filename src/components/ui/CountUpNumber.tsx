import { useEffect, useRef } from 'react'
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { motion } from 'motion/react'

interface CountUpNumberProps {
  value: number
  decimals?: number
  className?: string
  style?: React.CSSProperties
}

// The hero number counting up after a save is the app's signature moment (spec §9).
export function CountUpNumber({ value, decimals = 1, className, style }: CountUpNumberProps) {
  const reducedMotion = useReducedMotion()
  const motionValue = useMotionValue(value)
  const rounded = useTransform(motionValue, (v) => v.toFixed(decimals))
  const previous = useRef(value)

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.55,
      ease: 'easeOut',
      onUpdate: (v) => motionValue.set(v),
    })
    previous.current = value
    return () => controls.stop()
  }, [value, reducedMotion, motionValue])

  return (
    <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {rounded}
    </motion.span>
  )
}
