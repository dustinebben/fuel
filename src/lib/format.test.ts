import { describe, expect, it } from 'vitest'
import { formatCurrency, formatKm } from './format'

describe('formatCurrency', () => {
  it('matches the spec example: space thousands separator, comma decimal', () => {
    expect(formatCurrency(1261)).toBe('R1 261,00')
  })

  it('handles values under a thousand with no grouping', () => {
    expect(formatCurrency(800)).toBe('R800,00')
  })

  it('returns an em dash for null/undefined/NaN rather than a misleading number', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency(NaN)).toBe('—')
  })

  it('can drop decimals for whole-rand display', () => {
    expect(formatCurrency(45000, { decimals: false })).toBe('R45 000')
  })
})

describe('formatKm', () => {
  it('groups thousands with a space and appends the unit', () => {
    expect(formatKm(118620)).toBe('118 620 km')
  })
})
