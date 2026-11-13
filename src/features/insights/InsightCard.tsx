import type { ReactNode } from 'react'
import { GlassCard } from '../../components/glass/GlassCard'

export function InsightCard({
  label,
  children,
  index = 0,
  className = '',
}: {
  label: string
  children: ReactNode
  index?: number
  className?: string
}) {
  return (
    <GlassCard index={index} className={`p-5 has-[[data-empty]]:p-3.5 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">{label}</p>
      <div className="mt-2">{children}</div>
    </GlassCard>
  )
}

/** Every card must degrade calmly with 0/1/2 fill-ups — never NaN, never a bare dash. */
export function EmptyState({ message = 'One more fill-up and this comes alive.' }: { message?: string }) {
  return <p data-empty className="text-xs leading-relaxed text-white/35">{message}</p>
}
