import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Loads a game_sessions row and confirms the caller owns it — the "does
 * this caller own this session" check every host-only action needs
 * (CLAUDE.md rule 7 / SPEC.md §5). Returns a discriminated result instead
 * of throwing so callers can map straight to an HTTP error response. */
export async function loadOwnedSession(
  admin: SupabaseClient,
  sessionId: string,
  hostUserId: string,
): Promise<
  | { ok: true; session: Record<string, unknown> }
  | { ok: false; code: 'SESSION_NOT_FOUND' | 'FORBIDDEN' }
> {
  const { data, error } = await admin
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, code: 'SESSION_NOT_FOUND' }
  }
  if (data.host_id !== hostUserId) {
    return { ok: false, code: 'FORBIDDEN' }
  }
  return { ok: true, session: data }
}
