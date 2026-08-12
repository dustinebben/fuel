// Generated from the live Supabase project ("Project Fuel") via
//   supabase gen types typescript --project-id vejtwljsbdrdqpvfjgxi
// `fuel_type` / `price_zone` are narrowed from the generated `string` to the literal
// unions below — Postgres CHECK constraints aren't reflected in generated types, but
// the app depends on the narrower type everywhere it branches on fuel/zone. Re-narrow
// the same two columns again after any future regeneration; leave everything else as
// codegen produces it.

export type FuelType = '93' | '95' | 'diesel-50' | 'diesel-500'
export type PriceZone = 'inland' | 'coastal'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      fill_ups: {
        Row: {
          computer_l_per_100km: number | null
          created_at: string
          filled_at: string
          fuel_grade: string | null
          id: string
          is_full_tank: boolean
          litres: number
          missed_previous: boolean
          notes: string | null
          odometer_km: number
          range_estimate_km: number | null
          station: string | null
          total_cost: number
          user_id: string
          vehicle_id: string
        }
        Insert: {
          computer_l_per_100km?: number | null
          created_at?: string
          filled_at?: string
          fuel_grade?: string | null
          id?: string
          is_full_tank?: boolean
          litres: number
          missed_previous?: boolean
          notes?: string | null
          odometer_km: number
          range_estimate_km?: number | null
          station?: string | null
          total_cost: number
          user_id?: string
          vehicle_id: string
        }
        Update: {
          computer_l_per_100km?: number | null
          created_at?: string
          filled_at?: string
          fuel_grade?: string | null
          id?: string
          is_full_tank?: boolean
          litres?: number
          missed_previous?: boolean
          notes?: string | null
          odometer_km?: number
          range_estimate_km?: number | null
          station?: string | null
          total_cost?: number
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fill_ups_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      fuel_prices: {
        Row: {
          created_at: string
          effective_date: string
          fuel_type: FuelType
          id: string
          price_per_l: number
          price_zone: PriceZone
        }
        Insert: {
          created_at?: string
          effective_date: string
          fuel_type: FuelType
          id?: string
          price_per_l: number
          price_zone: PriceZone
        }
        Update: {
          created_at?: string
          effective_date?: string
          fuel_type?: FuelType
          id?: string
          price_per_l?: number
          price_zone?: PriceZone
        }
        Relationships: []
      }
      keepalive: {
        Row: {
          id: number
          pinged_at: string
        }
        Insert: {
          id?: number
          pinged_at?: string
        }
        Update: {
          id?: number
          pinged_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          fuel_type: FuelType
          id: string
          is_default: boolean
          make: string | null
          model: string | null
          name: string
          price_zone: PriceZone
          tank_capacity_l: number | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          fuel_type?: FuelType
          id?: string
          is_default?: boolean
          make?: string | null
          model?: string | null
          name: string
          price_zone?: PriceZone
          tank_capacity_l?: number | null
          user_id?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          fuel_type?: FuelType
          id?: string
          is_default?: boolean
          make?: string | null
          model?: string | null
          name?: string
          price_zone?: PriceZone
          tank_capacity_l?: number | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      fill_ups_enriched: {
        // Codegen marks every view column nullable by default (Postgres doesn't expose
        // NOT NULL through views generically). In practice `fill_ups_enriched` is a
        // straight `select f.*, ...` over `fill_ups` partitioned by window functions —
        // every base column is exactly as present/absent as it is on the underlying
        // NOT NULL fill_ups row. Only the window-derived columns are genuinely nullable
        // (see supabase/migrations/0003_enriched_view.sql).
        Row: Database['public']['Tables']['fill_ups']['Row'] & {
          prev_odometer_km: number | null
          prev_is_full: boolean | null
          prev_range_estimate: number | null
          prev_filled_at: string | null
          distance_km: number | null
          price_per_litre: number | null
          actual_l_per_100km: number | null
          cost_per_km: number | null
          range_estimate_error_km: number | null
          days_since_prev: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'fill_ups_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: Record<string, never>
  }
}

export type VehicleRow = Database['public']['Tables']['vehicles']['Row']
export type FillUpRow = Database['public']['Tables']['fill_ups']['Row']
export type FillUpInsert = Database['public']['Tables']['fill_ups']['Insert']
export type FuelPriceRow = Database['public']['Tables']['fuel_prices']['Row']
export type EnrichedFillUpRow = Database['public']['Views']['fill_ups_enriched']['Row']
