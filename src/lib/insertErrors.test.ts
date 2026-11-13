import { describe, expect, it } from 'vitest'
import { classifyInsertError } from './insertErrors'

describe('classifyInsertError', () => {
  it('treats a failed fetch (no Postgres code) as a network problem', () => {
    expect(classifyInsertError({ message: 'TypeError: Failed to fetch' }).kind).toBe('network')
    expect(classifyInsertError({ message: 'Load failed', code: '' }).kind).toBe('network')
    expect(classifyInsertError({ message: 'NetworkError when attempting to fetch resource.' }).kind).toBe('network')
  })

  it('explains a duplicate odometer', () => {
    const result = classifyInsertError({ code: '23505', message: 'duplicate key value violates unique constraint "fill_ups_no_dupe_odo"' })
    expect(result).toEqual({ kind: 'rejected', message: 'A fill-up with that odometer reading already exists.' })
  })

  it('explains a check-constraint violation', () => {
    const result = classifyInsertError({ code: '23514', message: 'new row violates check constraint "litres_positive"' })
    expect(result.kind).toBe('rejected')
  })

  it('asks for a fresh sign-in on auth failures', () => {
    for (const code of ['PGRST301', 'PGRST303', '42501']) {
      const result = classifyInsertError({ code, message: 'x' })
      expect(result.kind).toBe('rejected')
      expect((result as { message: string }).message).toMatch(/sign in/i)
    }
  })

  it('passes through an unknown server message', () => {
    expect(classifyInsertError({ code: 'XX000', message: 'boom' })).toEqual({ kind: 'rejected', message: 'boom' })
  })
})
