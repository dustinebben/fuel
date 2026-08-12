import type { InputHTMLAttributes } from 'react'

interface NumericFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'onChange'> {
  label: string
  suffix?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}

// type="number" is banned on iOS: it brings the wrong keyboard and an accidental
// scroll can change the value. Every numeric field in this app is text + decimal.
export function NumericField({ label, suffix, value, onChange, error, hint, id, ...props }: NumericFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:ring-2 focus-within:ring-[--color-accent]">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full bg-transparent text-lg text-white placeholder:text-white/25 focus:outline-none"
          style={{ fontVariantNumeric: 'tabular-nums' }}
          {...props}
        />
        {suffix && <span className="shrink-0 text-sm text-white/40">{suffix}</span>}
      </div>
      {error && <span className="mt-1 block text-xs text-[--color-bad]">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-[--color-warn]">{hint}</span>}
    </label>
  )
}
