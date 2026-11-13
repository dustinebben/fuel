import type { EnrichedFillUpRow, FillUpRow } from './database.types'

/** The stored fill_ups columns of an enriched row, with every derived column dropped.
 * Used to re-insert a deleted fill-up (undo) without sending view-only columns. */
export function baseColumns(row: EnrichedFillUpRow): FillUpRow {
  return {
    id: row.id,
    user_id: row.user_id,
    vehicle_id: row.vehicle_id,
    filled_at: row.filled_at,
    odometer_km: row.odometer_km,
    litres: row.litres,
    total_cost: row.total_cost,
    computer_l_per_100km: row.computer_l_per_100km,
    range_estimate_km: row.range_estimate_km,
    is_full_tank: row.is_full_tank,
    missed_previous: row.missed_previous,
    station: row.station,
    fuel_grade: row.fuel_grade,
    notes: row.notes,
    created_at: row.created_at,
  }
}
