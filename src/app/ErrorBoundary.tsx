import { Component, type ErrorInfo, type ReactNode } from 'react'
import { GlassCard } from '../components/glass/GlassCard'
import { Button } from '../components/ui/Button'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in Fuel:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center px-6">
          <GlassCard className="w-full max-w-sm p-8 text-center">
            <p className="text-lg font-semibold text-white">Something went wrong</p>
            <p className="mt-2 text-sm text-white/50">{this.state.error.message}</p>
            <Button className="mt-6 w-full" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </GlassCard>
        </div>
      )
    }
    return this.props.children
  }
}
