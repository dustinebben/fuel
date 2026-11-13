// Petrol stations have poor reception, and that's the one moment this app gets used.
// Only writes that failed because the network was unreachable land here (durable across a
// cold start), then sync to Neon. A write the server rejects is NOT silently queued.
// Conflict resolution is trivially last-write-wins — single user, single device.

import Dexie, { type EntityTable } from 'dexie'
import type { FillUpInsert } from './database.types'

export interface QueuedFillUp {
  localId: string
  payload: FillUpInsert
  createdAt: number
  /** Set when the server answered and refused this write. Such items stay in the queue
   * for the person to fix or discard, and are never retried automatically. */
  lastError?: string
}

class FuelOfflineDB extends Dexie {
  queuedFillUps!: EntityTable<QueuedFillUp, 'localId'>

  constructor() {
    super('fuel-offline')
    this.version(1).stores({
      queuedFillUps: 'localId, createdAt',
    })
  }
}

export const offlineDB = new FuelOfflineDB()

export async function enqueueFillUp(payload: FillUpInsert): Promise<QueuedFillUp> {
  const entry: QueuedFillUp = {
    localId: crypto.randomUUID(),
    payload,
    createdAt: Date.now(),
  }
  await offlineDB.queuedFillUps.add(entry)
  return entry
}

export async function dequeueFillUp(localId: string): Promise<void> {
  await offlineDB.queuedFillUps.delete(localId)
}

export async function pendingFillUps(): Promise<QueuedFillUp[]> {
  return offlineDB.queuedFillUps.orderBy('createdAt').toArray()
}

export async function pendingCount(): Promise<number> {
  return offlineDB.queuedFillUps.count()
}

export async function markQueuedFailed(localId: string, lastError: string): Promise<void> {
  await offlineDB.queuedFillUps.update(localId, { lastError })
}

export async function clearQueuedFailure(localId: string): Promise<void> {
  await offlineDB.queuedFillUps.where('localId').equals(localId).modify((item) => {
    delete item.lastError
  })
}
