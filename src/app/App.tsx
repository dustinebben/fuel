import { Providers } from './providers'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthGate } from '../features/auth/AuthGate'
import { AppShell } from './AppShell'
import { UpdatePrompt } from './UpdatePrompt'

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <UpdatePrompt />
        <AuthGate>
          <AppShell />
        </AuthGate>
      </Providers>
    </ErrorBoundary>
  )
}
