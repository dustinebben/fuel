import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { VehicleRow } from '../../lib/database.types'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** The vehicle every screen operates on: the one flagged default, else the first. */
export function useDefaultVehicle() {
  const query = useVehicles()
  const vehicle = query.data?.find((v) => v.is_default) ?? query.data?.[0] ?? null
  return { ...query, vehicle }
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      fuelType: VehicleRow['fuel_type']
      priceZone: VehicleRow['price_zone']
      tankCapacityL: number | null
    }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          name: input.name,
          fuel_type: input.fuelType,
          price_zone: input.priceZone,
          tank_capacity_l: input.tankCapacityL,
          is_default: true,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<VehicleRow> & { id: string }) => {
      const { data, error } = await supabase.from('vehicles').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })
}
