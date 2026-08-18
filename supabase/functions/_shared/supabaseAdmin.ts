import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Service-role client. Bypasses RLS — this is the only privileged path
 * into game tables (CLAUDE.md rule 4). Never expose this key to the
 * client; it only ever lives in edge function secrets (rule 6). */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/** Client scoped to the caller's own JWT, used only to resolve who the
 * caller is (auth.getUser()) — never for privileged table access. */
export function createCallerClient(authHeader: string | null): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      auth: { persistSession: false },
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    },
  )
}
