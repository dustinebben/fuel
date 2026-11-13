import { useEffect, useState } from 'react'
import { db } from '../../lib/db'

export type Session = NonNullable<Awaited<ReturnType<typeof db.auth.getSession>>['data']['session']>

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = db.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
