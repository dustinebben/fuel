// Petrol stations have poor reception, and that's the one moment this app gets used.
// Writes land here first (durable across a cold start), then sync to Supabase.
// Conflict resolution is trivially last-write-wins — single user, single device.

import Dexie, { type EntityTable } from 'dexie'
import type { FillUpInsert } from './database.types'

export interface QueuedFillUp {
  localId: string
  payload: FillUpInsert
  createdAt: number
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
