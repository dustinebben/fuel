// Turns the date a person picked into the timestamp stored on a fill-up. The form only
// captures a day, so: today keeps the real moment, any past day is stamped local noon
// (a stable, unsurprising time), and editing a fill-up without changing its day leaves
// the original timestamp untouched.

import { toDateInputValue } from './format'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function resolveFilledAt({ date, now, existing }: { date: string; now: Date; existing?: string }): string | null {
  const m = DATE_RE.exec(date)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const noon = new Date(y, mo - 1, d, 12, 0, 0, 0)
  // Reject impossible dates like 31 Feb (Date would silently roll them over).
  if (noon.getFullYear() !== y || noon.getMonth() !== mo - 1 || noon.getDate() !== d) return null

  const today = toDateInputValue(now)
  if (date > today) return null
  if (existing && toDateInputValue(new Date(existing)) === date) return existing
  if (date === today) return now.toISOString()
  return noon.toISOString()
}
