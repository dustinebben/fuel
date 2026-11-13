import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/db'
import type { FuelPriceRow } from '../../lib/database.types'

export function useFuelPrices() {
  return useQuery({
    queryKey: ['fuel_prices'],
    queryFn: async (): Promise<FuelPriceRow[]> => {
      const { data, error } = await db.from('fuel_prices').select('*').order('effective_date', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 60 * 60 * 1000,
  })
}
