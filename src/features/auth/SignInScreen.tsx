import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { GlassCard } from '../../components/glass/GlassCard'
import { Button } from '../../components/ui/Button'

type Step = { kind: 'email' } | { kind: 'code'; email: string }

export function SignInScreen() {
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // TEMPORARY: true so the owner can create their one account through this same
    // screen — no separate sign-up UI. Per CLAUDE.md §4, flip back to false (or just
    // delete this comment and leave it false) once the account exists, and turn off
    // "Allow new users to sign up" in Supabase → Auth → Sign In / Up. That dashboard
    // setting is the actual lock; this flag alone doesn't stop new accounts.
    const { error } = await supabase.auth.signInWithOtp({
      email: value.trim(),
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep({ kind: 'code', email: value.trim() })
    setValue('')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (step.kind !== 'code') return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: step.email,
      token: value.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Fuel</h1>
        <p className="mt-1 text-sm text-white/60">
          {step.kind === 'email' ? 'Sign in with your email.' : `Enter the code sent to ${step.email}.`}
        </p>

        <form onSubmit={step.kind === 'email' ? sendCode : verifyCode} className="mt-6 space-y-4">
          {step.kind === 'email' ? (
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@example.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
            />
          ) : (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              placeholder="123456"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          )}

          {error && <p className="text-sm text-[--color-bad]">{error}</p>}

          <Button type="submit" disabled={busy || value.trim().length === 0} className="w-full">
            {busy ? 'Please wait…' : step.kind === 'email' ? 'Send code' : 'Verify'}
          </Button>

          {step.kind === 'code' && (
            <button
              type="button"
              onClick={() => {
                setStep({ kind: 'email' })
                setValue('')
                setError(null)
              }}
              className="w-full text-center text-sm text-white/50"
            >
              Use a different email
            </button>
          )}
        </form>
      </GlassCard>
    </div>
  )
}
