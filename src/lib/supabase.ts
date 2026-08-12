import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.')
}

// TEMPORARY: true so clicking the magic link in the (untemplated, shared-SMTP) email
// can complete the bootstrap sign-in in this browser tab. Per CLAUDE.md §4 this should
// be false for the shipped PWA build — a magic link opens Safari, which is a separate
// storage context from an installed PWA, so the session lands somewhere the app can't
// see it. Flip back to false once the owner account exists.
const detectSessionInUrl = true

// The anon key is public by design and safe to ship — see CLAUDE.md "Security".
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl,
  },
})
