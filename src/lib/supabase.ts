import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// .trim() guards against a stray trailing newline/whitespace in the env
// var value (e.g. from pasting into Vercel's dashboard) — REST calls and
// edge functions send the key in an HTTP header, which gets trimmed
// automatically, so they'd work fine; the Realtime websocket sends it in
// the URL query string, where an untrimmed trailing char breaks the
// signature check with an opaque "HTTP Authentication failed" and no
// indication the key itself was the problem.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

/** Throws with a message aimed at whoever is setting up .env, not a
 * player — only ever called after isSupabaseConfigured has been checked
 * at the app root, so this is a defensive backstop, not the primary
 * "not configured" UI path (see App.tsx). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}
