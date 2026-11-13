import { describe, expect, it } from 'vitest'
import { enrichFillUps } from './metrics'
import { baseColumns } from './fillUpRow'
import type { FillUpRow } from './database.types'

const base: FillUpRow = {
  id: 'a', user_id: 'u', vehicle_id: 'v', filled_at: '2026-01-01T00:00:00Z', odometer_km: 1000, litres: 30,
  total_cost: 800, computer_l_per_100km: 7.1, range_estimate_km: 400, is_full_tank: true, missed_previous: false,
  station: 'BP', fuel_grade: null, notes: null, created_at: '2026-01-01T00:00:00Z',
}

describe('baseColumns', () => {
  it('strips every derived column, leaving exactly the stored fill_ups columns', () => {
    const [enriched] = enrichFillUps([base])
    expect(baseColumns(enriched)).toEqual(base)
  })
})
