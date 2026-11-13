// Decides what a failed write means. A network failure is the ONLY thing that may be
// quietly queued for later; anything the server actually answered is a real error the
// user has to see (queueing it would just fail again and hide the problem).

export interface WriteError {
  code?: string | null
  message?: string | null
}

export type ClassifiedError = { kind: 'network' } | { kind: 'rejected'; message: string }

const NETWORK_MESSAGE = /failed to fetch|load failed|network|timed? ?out|offline|aborted/i

export function classifyInsertError(error: WriteError): ClassifiedError {
  const code = error.code ?? ''
  const message = error.message ?? ''

  if (!code && NETWORK_MESSAGE.test(message)) return { kind: 'network' }

  if (code === '23505') return { kind: 'rejected', message: 'A fill-up with that odometer reading already exists.' }
  if (code === '23514') return { kind: 'rejected', message: 'One of the values is out of range. Check odometer, litres and cost.' }
  if (code === 'PGRST301' || code === 'PGRST303' || code === '42501') {
    return { kind: 'rejected', message: 'Your session has expired. Sign in again to save.' }
  }
  return { kind: 'rejected', message: message || 'Could not save the fill-up.' }
}
