import type { InputHTMLAttributes } from 'react'

interface NumericFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'onChange'> {
  label: string
  suffix?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}

// Some devices' decimal-optimized keyboard emits ',' instead of '.' depending on
// locale (relevant here specifically, since en-ZA itself uses ',' as the decimal
// separator — see format.ts). Accept either, normalize to '.', and keep only the
// first one so the field can't end up unparseable like "12.3.4".
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
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
          onChange={(e) => onChange(sanitizeDecimalInput(e.target.value))}
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
