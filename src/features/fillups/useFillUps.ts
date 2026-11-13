import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { db } from '../../lib/db'
import {
  clearQueuedFailure,
  dequeueFillUp,
  enqueueFillUp,
  markQueuedFailed,
  pendingCount,
  pendingFillUps,
} from '../../lib/offlineQueue'
import { classifyInsertError } from '../../lib/insertErrors'
import { baseColumns } from '../../lib/fillUpRow'
import type { EnrichedFillUpRow, FillUpInsert } from '../../lib/database.types'

export const FILL_UPS_KEY = 'fill_ups_enriched'
export const PENDING_KEY = 'offline-pending-count'
export const QUEUE_KEY = 'offline-queue'

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

export function useQueuedFillUps() {
  return useQuery({
    queryKey: [QUEUE_KEY],
    queryFn: pendingFillUps,
    staleTime: Infinity,
  })
}

async function refreshQueueQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: [PENDING_KEY] })
  await queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] })
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
        const classified = classifyInsertError(error)
        // Only an unreachable network is queued silently. Anything the server answered
        // (duplicate odometer, expired session, permissions…) is a real error to show.
        if (classified.kind === 'network') {
          await enqueueFillUp(fullPayload)
          return { queued: true as const }
        }
        throw new Error(classified.message)
      }
      return { queued: false as const }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) })
      await refreshQueueQueries(queryClient)
    },
  })
}

export function useUpdateFillUp(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Omit<FillUpInsert, 'vehicle_id' | 'id' | 'user_id'>) => {
      if (!navigator.onLine) throw new Error("You're offline. Edits need a connection.")
      const { error } = await db.from('fill_ups').update(patch).eq('id', id)
      if (error) {
        const classified = classifyInsertError(error)
        throw new Error(classified.kind === 'network' ? "Couldn't reach the server. Try again." : classified.message)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) }),
  })
}

export function useDeleteFillUp(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) throw new Error("You're offline. Deleting needs a connection.")
      const { error } = await db.from('fill_ups').delete().eq('id', id)
      if (error) throw new Error(classifyInsertError(error).kind === 'network' ? "Couldn't reach the server. Try again." : error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) }),
  })
}

/** Undo a delete: put the exact stored row back (same id, same timestamps). */
export function useRestoreFillUp(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (row: EnrichedFillUpRow) => {
      const { error } = await db.from('fill_ups').insert(baseColumns(row))
      if (error) throw new Error(classifyInsertError(error).kind === 'network' ? "Couldn't reach the server. Try again." : error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fillUpsQueryKey(vehicleId) }),
  })
}

/** Sends queued fill-ups. Stops at the first network failure (still offline); a write the
 * server refuses is flagged on its queue item and skipped, so one bad entry can't block
 * the rest. Items already flagged are left for the person to retry or discard. */
export async function flushOfflineQueue(queryClient: QueryClient) {
  if (!navigator.onLine) return
  const queued = await pendingFillUps()
  for (const item of queued) {
    if (item.lastError) continue
    const { error } = await db.from('fill_ups').insert(item.payload)
    if (error) {
      const classified = classifyInsertError(error)
      if (classified.kind === 'network') break
      await markQueuedFailed(item.localId, classified.message)
      continue
    }
    await dequeueFillUp(item.localId)
  }
  await refreshQueueQueries(queryClient)
  await queryClient.invalidateQueries({ queryKey: [FILL_UPS_KEY] })
}

export async function retryQueuedFillUp(queryClient: QueryClient, localId: string) {
  await clearQueuedFailure(localId)
  await flushOfflineQueue(queryClient)
}

export async function discardQueuedFillUp(queryClient: QueryClient, localId: string) {
  await dequeueFillUp(localId)
  await refreshQueueQueries(queryClient)
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
