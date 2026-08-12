import type { ReactNode } from 'react'
import { useSession } from './useSession'
import { SignInScreen } from './SignInScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-white/40">Loading…</div>
  }

  if (!session) {
    return <SignInScreen />
  }

  return <>{children}</>
}
