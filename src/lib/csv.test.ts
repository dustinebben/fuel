import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { enrichFillUps } from './metrics'
import type { FillUpRow } from './database.types'

function fillUp(overrides: Partial<FillUpRow>): FillUpRow {
  return {
    id: 'f1',
    user_id: 'u1',
    vehicle_id: 'v1',
    filled_at: '2026-01-01T08:00:00Z',
    odometer_km: 1000,
    litres: 40,
    total_cost: 800,
    computer_l_per_100km: null,
    range_estimate_km: null,
    is_full_tank: true,
    missed_previous: false,
    station: 'Engen, Sandton',
    fuel_grade: null,
    notes: null,
    created_at: '2026-01-01T08:00:00Z',
    ...overrides,
  }
}

describe('toCsv', () => {
  it('produces a header row plus one row per fill-up', () => {
    const rows = enrichFillUps([fillUp({})])
    const csv = toCsv(rows)
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Date')
    expect(lines[0]).toContain('Odometer (km)')
  })

  it('quotes fields containing a comma', () => {
    const rows = enrichFillUps([fillUp({ station: 'Engen, Sandton' })])
    const csv = toCsv(rows)
    expect(csv).toContain('"Engen, Sandton"')
  })

  it('leaves unmeasurable numeric fields blank rather than printing null', () => {
    const rows = enrichFillUps([fillUp({})])
    const csv = toCsv(rows)
    expect(csv).not.toMatch(/null/)
  })
})
