import { createClient } from '@neon/neon-js/supabase'
import type { Database } from './database.types'

const url = import.meta.env.VITE_NEON_URL

if (!url) {
  throw new Error('Missing VITE_NEON_URL — copy .env.example to .env and fill it in.')
}

// One client for both Managed Better Auth and the Data API. The base URL is public by
// design: every request is authorised by the user's JWT plus Postgres RLS (see
// db/migrations/0002_rls.sql), not by secrecy of the URL — see CLAUDE.md "Security".
// The Supabase-compatible adapter keeps the `db.auth.*` / `db.from(...)` call shapes.
export const db = createClient<Database>(url)
