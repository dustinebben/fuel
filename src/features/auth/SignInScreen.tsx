import { useState, type FormEvent } from 'react'
import { db } from '../../lib/db'
import { GlassCard } from '../../components/glass/GlassCard'
import { Button } from '../../components/ui/Button'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[--color-accent]'

// Sign-in only. There is deliberately no sign-up UI (CLAUDE.md "Security"): the one
// account is created out-of-band and new sign-ups are disabled in Neon Auth.
export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message)
    // On success useSession's auth listener swaps this screen for the app.
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Fuel</h1>
        <p className="mt-1 text-sm text-white/60">Sign in to continue.</p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />

          {error && <p className="text-sm text-[--color-bad]">{error}</p>}

          <Button type="submit" disabled={busy || email.trim().length === 0 || password.length === 0} className="w-full">
            {busy ? 'Please wait…' : 'Sign in'}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
