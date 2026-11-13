// The only place a currency symbol, unit string, or date format appears. If you find
// yourself writing "R" or "km" anywhere else in the app, that's a bug — import from here.
//
// Currency/distance grouping is hand-rolled rather than left to
// Intl.NumberFormat('en-ZA'): the en-ZA CLDR data disagrees on the decimal separator
// across ICU versions (observed "R 800.00" in Node vs the spec's "R1 261,00"), which
// would make the one thing this locale needs to get right non-deterministic across
// dev/test/prod. Space thousands separator, comma decimal — always, everywhere.

function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatCurrency(value: number | null | undefined, { decimals = true } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const fixed = Math.abs(value).toFixed(decimals ? 2 : 0)
  const [intPart, decPart] = fixed.split('.')
  return `${sign}R${groupThousands(intPart)}${decPart ? `,${decPart}` : ''}`
}

export function formatLitres(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(decimals)} L`
}

export function formatKm(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const fixed = Math.abs(value).toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  return `${sign}${groupThousands(intPart)}${decPart ? `,${decPart}` : ''} km`
}

export function formatL100km(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(decimals)} L/100km`
}

export function formatPercent(value: number | null | undefined, { showSign = true, decimals = 1 } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return dateFormatter.format(date)
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return dateTimeFormatter.format(date)
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Math.round(value)} day${Math.round(value) === 1 ? '' : 's'}`
}

/** Local calendar date as yyyy-mm-dd — the value an <input type="date"> reads and writes. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const L100KM_UNIT = 'L/100km'

/** A bare number to a fixed precision, for layouts that show the unit separately. */
export function formatDecimal(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(decimals)
}
