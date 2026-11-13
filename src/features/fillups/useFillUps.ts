import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import { dequeueFillUp, enqueueFillUp, pendingFillUps, pendingCount } from '../../lib/offlineQueue'
import type { EnrichedFillUpRow, FillUpInsert } from '../../lib/database.types'

export const FILL_UPS_KEY = 'fill_ups_enriched'
export const PENDING_KEY = 'offline-pending-count'

export function fillUpsQueryKey(vehicleId: string) {
  return [FILL_UPS_KEY, vehicleId] as const
}

export function useEnrichedFillUps(vehicleId: string | null) {
  return useQuery({
    queryKey: fillUpsQueryKey(vehicleId ?? 'none'),
    enabled: vehicleId !== null,
    queryFn: async (): Promise<EnrichedFillUpRow[]> => {
      const { data, error } = await db
        .from('fill_ups_enriched')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('odometer_km', { ascending: true })
      if (error) throw error
      return data as EnrichedFillUpRow[]
    },
  })
}

export function usePendingCount() {
  return useQuery({
    queryKey: [PENDING_KEY],
    queryFn: pendingCount,
    staleTime: Infinity,
  })
}

export function useCreateFillUp(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<FillUpInsert, 'vehicle_id'>) => {
      const fullPayload: FillUpInsert = { ...payload, vehicle_id: vehicleId }

      if (!navigator.onLine) {
        await enqueueFillUp(fullPayload)
        return { queued: true as const }
      }

      const { error } = await db.from('fill_ups').insert(fullPayload)
      if (error) {
        // Could be a real validation error or a flaky connection despite navigator.onLine.
        // Either way the fill-up must not be lost — queue it and let the sync manager retry.
        await enqueueFillUp(fullPayload)
        return { queued: true as const }
      }
      return { queued: false as const }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) })
      await queryClient.invalidateQueries({ queryKey: [PENDING_KEY] })
    },
  })
}

export async function flushOfflineQueue(queryClient: QueryClient) {
  if (!navigator.onLine) return
  const queued = await pendingFillUps()
  for (const item of queued) {
    const { error } = await db.from('fill_ups').insert(item.payload)
    if (error) break // still offline, or a real error — stop and retry on the next trigger
    await dequeueFillUp(item.localId)
  }
  await queryClient.invalidateQueries({ queryKey: [PENDING_KEY] })
  await queryClient.invalidateQueries({ queryKey: [FILL_UPS_KEY] })
}

/** Retries the offline queue on reconnect and app focus. Mount once, near the root. */
export function useOfflineSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const flush = () => void flushOfflineQueue(queryClient)
    flush()
    window.addEventListener('online', flush)
    window.addEventListener('focus', flush)
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('focus', flush)
    }
  }, [queryClient])
}
