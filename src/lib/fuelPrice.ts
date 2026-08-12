// South African petrol pricing calendar. See CLAUDE.md / spec §6: 93/95 ULP prices are
// regulated and change on the first Wednesday of every month. Diesel is a wholesale
// reference, not a regulated pump price. Prices themselves live in the `fuel_prices`
// table (supabase/migrations/0004_fuel_prices.sql) and are updated manually — this
// file only contains the pure date maths and lookup helpers around that data.

import type { FuelPriceRow, FuelType, PriceZone } from './database.types'

/** The next first-Wednesday-of-the-month strictly after `from`. */
export function nextFirstWednesday(from: Date): Date {
  const candidate = firstWednesdayOfMonth(from.getFullYear(), from.getMonth())
  if (candidate.getTime() > startOfDay(from).getTime()) return candidate
  const nextMonth = from.getMonth() === 11 ? 0 : from.getMonth() + 1
  const nextYear = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear()
  return firstWednesdayOfMonth(nextYear, nextMonth)
}

export function firstWednesdayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month, 1)
  const dayOfWeek = d.getDay() // 0 = Sunday, 3 = Wednesday
  const offset = (3 - dayOfWeek + 7) % 7
  d.setDate(1 + offset)
  return startOfDay(d)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysUntil(target: Date, from: Date): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(from).getTime()) / 86_400_000)
}

export interface NextPriceChange {
  date: Date
  daysUntil: number
}

export function nextPriceChange(from: Date): NextPriceChange {
  const date = nextFirstWednesday(from)
  return { date, daysUntil: daysUntil(date, from) }
}

/** Latest known price for a grade/zone at or before `onOrBefore`. */
export function currentPrice(
  prices: FuelPriceRow[],
  fuelType: FuelType,
  priceZone: PriceZone,
  onOrBefore: Date,
): FuelPriceRow | null {
  const target = onOrBefore.getTime()
  const matching = prices
    .filter((p) => p.fuel_type === fuelType && p.price_zone === priceZone && new Date(p.effective_date).getTime() <= target)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
  return matching[0] ?? null
}

/** The next scheduled price row after `from`, if one has already been entered. */
export function nextKnownPrice(
  prices: FuelPriceRow[],
  fuelType: FuelType,
  priceZone: PriceZone,
  from: Date,
): FuelPriceRow | null {
  const target = from.getTime()
  const matching = prices
    .filter((p) => p.fuel_type === fuelType && p.price_zone === priceZone && new Date(p.effective_date).getTime() > target)
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
  return matching[0] ?? null
}

/** Rand impact of filling a given tank size before vs after a known upcoming price change. */
export function fillBeforeSavings(tankCapacityL: number, currentPricePerL: number, nextPricePerL: number): number {
  return Math.round((nextPricePerL - currentPricePerL) * tankCapacityL * 100) / 100
}
