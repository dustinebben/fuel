import { motion } from 'motion/react'

export type TabKey = 'home' | 'history' | 'insights' | 'settings'

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'home', label: 'Home', icon: '⛽' },
  { key: 'history', label: 'History', icon: '🕘' },
  { key: 'insights', label: 'Insights', icon: '📊' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
]

export function GlassTabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav
      className="glass fixed inset-x-4 bottom-4 z-30 flex justify-around p-1.5"
      style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom))' }}
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className="relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-xs"
          >
            {isActive && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'var(--glass-tint-strong)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative text-base">{tab.icon}</span>
            <span className={`relative font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
