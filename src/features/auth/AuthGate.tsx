import type { ReactNode } from 'react'
import { useSession } from './useSession'
import { SignInScreen } from './SignInScreen'
import { LoadingSkeleton } from '../../app/LoadingSkeleton'

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!session) {
    return <SignInScreen />
  }

  return <>{children}</>
}
