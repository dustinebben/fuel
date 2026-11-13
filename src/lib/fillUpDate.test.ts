import { describe, expect, it } from 'vitest'
import { resolveFilledAt } from './fillUpDate'
import { toDateInputValue } from './format'

// Built from local-time components so the tests hold in any timezone.
const NOW = new Date(2026, 10, 13, 9, 30, 15) // 13 Nov 2026, 09:30:15 local

describe('toDateInputValue', () => {
  it('formats the local date as yyyy-mm-dd with zero padding', () => {
    expect(toDateInputValue(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toDateInputValue(NOW)).toBe('2026-11-13')
  })
})

describe('resolveFilledAt', () => {
  it('uses the current moment for today', () => {
    expect(resolveFilledAt({ date: '2026-11-13', now: NOW })).toBe(NOW.toISOString())
  })

  it('uses local noon for a past date', () => {
    const iso = resolveFilledAt({ date: '2026-11-08', now: NOW })!
    const d = new Date(iso)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 8, 12, 0])
  })

  it('keeps the original timestamp when editing and the day is unchanged', () => {
    const existing = new Date(2026, 9, 29, 17, 9, 21).toISOString()
    expect(resolveFilledAt({ date: '2026-10-29', now: NOW, existing })).toBe(existing)
  })

  it('moves an edited fill-up to noon when the day changes', () => {
    const existing = new Date(2026, 9, 29, 17, 9, 21).toISOString()
    const d = new Date(resolveFilledAt({ date: '2026-10-28', now: NOW, existing })!)
    expect([d.getDate(), d.getHours()]).toEqual([28, 12])
  })

  it('rejects future dates and malformed input', () => {
    expect(resolveFilledAt({ date: '2026-11-14', now: NOW })).toBeNull()
    expect(resolveFilledAt({ date: 'nonsense', now: NOW })).toBeNull()
    expect(resolveFilledAt({ date: '', now: NOW })).toBeNull()
    expect(resolveFilledAt({ date: '2026-02-31', now: NOW })).toBeNull()
  })
})
