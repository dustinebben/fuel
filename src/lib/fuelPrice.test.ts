import { describe, expect, it } from 'vitest'
import {
  currentPrice,
  daysUntil,
  fillBeforeSavings,
  firstWednesdayOfMonth,
  nextFirstWednesday,
  nextKnownPrice,
} from './fuelPrice'
import type { FuelPriceRow } from './database.types'

describe('firstWednesdayOfMonth', () => {
  it('finds the first Wednesday when the 1st is a Wednesday', () => {
    // July 2026: 1 July 2026 is a Wednesday.
    const d = firstWednesdayOfMonth(2026, 6)
    expect(d.getDay()).toBe(3)
    expect(d.getDate()).toBe(1)
  })

  it('finds the first Wednesday when the 1st is a Thursday', () => {
    // January 2026: 1 Jan 2026 is a Thursday -> first Wednesday is the 7th.
    const d = firstWednesdayOfMonth(2026, 0)
    expect(d.getDay()).toBe(3)
    expect(d.getDate()).toBe(7)
  })

  it('finds the first Wednesday when the 1st is a Tuesday', () => {
    // September 2026: 1 Sep 2026 is a Tuesday -> first Wednesday is the 2nd.
    const d = firstWednesdayOfMonth(2026, 8)
    expect(d.getDay()).toBe(3)
    expect(d.getDate()).toBe(2)
  })

  it('handles every month of a year without drifting', () => {
    for (let month = 0; month < 12; month++) {
      const d = firstWednesdayOfMonth(2026, month)
      expect(d.getDay()).toBe(3)
      expect(d.getDate()).toBeLessThanOrEqual(7)
      expect(d.getMonth()).toBe(month)
    }
  })
})

describe('nextFirstWednesday', () => {
  it('rolls over to next month when already past this month\'s first Wednesday', () => {
    // 1 July 2026 (Wed) itself -> next is 5 Aug 2026.
    const from = new Date(2026, 6, 1)
    const next = nextFirstWednesday(from)
    expect(next.getMonth()).toBe(7)
    expect(next.getDate()).toBe(5)
  })

  it('returns this month\'s first Wednesday when still ahead of it', () => {
    const from = new Date(2026, 5, 15) // 15 June 2026
    const next = nextFirstWednesday(from)
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(1)
  })

  it('rolls over the year boundary from December to January', () => {
    const from = new Date(2026, 11, 10) // 10 Dec 2026, past Dec's first Wednesday (2 Dec)
    const next = nextFirstWednesday(from)
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(0)
    expect(next.getDay()).toBe(3)
  })
})

describe('daysUntil', () => {
  it('counts whole days between two dates', () => {
    expect(daysUntil(new Date(2026, 7, 5), new Date(2026, 7, 1))).toBe(4)
  })
})

const PRICES: FuelPriceRow[] = [
  { id: '1', effective_date: '2026-06-01', fuel_type: '95', price_zone: 'inland', price_per_l: 25.5, created_at: '' },
  { id: '2', effective_date: '2026-07-01', fuel_type: '95', price_zone: 'inland', price_per_l: 26.1, created_at: '' },
  { id: '3', effective_date: '2026-08-05', fuel_type: '95', price_zone: 'inland', price_per_l: 26.48, created_at: '' },
]

describe('currentPrice / nextKnownPrice', () => {
  it('picks the latest effective price on or before the date', () => {
    const price = currentPrice(PRICES, '95', 'inland', new Date(2026, 6, 15))
    expect(price?.price_per_l).toBe(26.1)
  })

  it('returns the next scheduled price after the date, if known', () => {
    const price = nextKnownPrice(PRICES, '95', 'inland', new Date(2026, 6, 15))
    expect(price?.price_per_l).toBe(26.48)
  })

  it('returns null when no price is known yet for that grade/zone', () => {
    expect(currentPrice(PRICES, 'diesel-50', 'coastal', new Date(2026, 6, 15))).toBeNull()
  })
})

describe('fillBeforeSavings', () => {
  it('matches the spec worked example: 38c rise on a ~47L tank ≈ R18', () => {
    const savings = fillBeforeSavings(47, 26.1, 26.48)
    expect(savings).toBeCloseTo(17.86, 1)
  })
})
