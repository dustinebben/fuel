import { describe, expect, it } from 'vitest'
import { sanitizeDecimalInput } from './NumericField'

describe('sanitizeDecimalInput', () => {
  it('passes a normal decimal through unchanged', () => {
    expect(sanitizeDecimalInput('7.3')).toBe('7.3')
  })

  it('normalizes a comma decimal to a period (locale-dependent decimal keyboards)', () => {
    expect(sanitizeDecimalInput('7,3')).toBe('7.3')
  })

  it('strips non-numeric characters', () => {
    expect(sanitizeDecimalInput('7a.3b')).toBe('7.3')
  })

  it('collapses a second decimal point rather than producing an unparseable value', () => {
    expect(sanitizeDecimalInput('12.3.4')).toBe('12.34')
    expect(Number.isNaN(Number(sanitizeDecimalInput('12.3.4')))).toBe(false)
  })

  it('allows a trailing decimal point while typing', () => {
    expect(sanitizeDecimalInput('7.')).toBe('7.')
  })
})
