// Client-side CSV export — the escape hatch. No server round-trip.

import type { EnrichedFillUpRow } from './database.types'
import { formatDate } from './format'

const COLUMNS: Array<{ header: string; get: (row: EnrichedFillUpRow) => string | number }> = [
  { header: 'Date', get: (r) => formatDate(r.filled_at) },
  { header: 'Odometer (km)', get: (r) => r.odometer_km },
  { header: 'Litres', get: (r) => r.litres },
  { header: 'Total cost (R)', get: (r) => r.total_cost },
  { header: 'Price per litre (R)', get: (r) => r.price_per_litre ?? '' },
  { header: 'Distance (km)', get: (r) => r.distance_km ?? '' },
  { header: 'Actual L/100km', get: (r) => r.actual_l_per_100km ?? '' },
  { header: 'Dash L/100km', get: (r) => r.computer_l_per_100km ?? '' },
  { header: 'Cost per km (R)', get: (r) => r.cost_per_km ?? '' },
  { header: 'Full tank', get: (r) => (r.is_full_tank ? 'yes' : 'no') },
  { header: 'Missed previous', get: (r) => (r.missed_previous ? 'yes' : 'no') },
  { header: 'Station', get: (r) => r.station ?? '' },
  { header: 'Notes', get: (r) => r.notes ?? '' },
]

function escapeCsvField(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: EnrichedFillUpRow[]): string {
  const chrono = [...rows].sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime())
  const lines = [
    COLUMNS.map((c) => c.header).join(','),
    ...chrono.map((row) => COLUMNS.map((c) => escapeCsvField(c.get(row))).join(',')),
  ]
  return lines.join('\r\n')
}

export function downloadCsv(rows: EnrichedFillUpRow[], filename = 'fuel-export.csv') {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
