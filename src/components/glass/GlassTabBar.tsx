import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export type TabKey = 'home' | 'history' | 'insights' | 'settings'

// Simple line icons that take the label colour via currentColor. Emoji render
// inconsistently on iOS and clash with the glass look.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

const TABS: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: 'home',
    label: 'Home',
    icon: (
      <Icon>
        <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
        <path d="M3 21h12" />
        <path d="M7 9h4" />
        <path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" />
      </Icon>
    ),
  },
  {
    key: 'history',
    label: 'History',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    ),
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: (
      <Icon>
        <path d="M5 20v-9" />
        <path d="M12 20V4" />
        <path d="M19 20v-6" />
      </Icon>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (
      <Icon>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </Icon>
    ),
  },
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
            <span className={`relative ${isActive ? 'text-white' : 'text-white/50'}`}>{tab.icon}</span>
            <span className={`relative font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
