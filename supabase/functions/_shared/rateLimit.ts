import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Comfortably past every current window (join-session, generate-quiz,
// create-session, submit-answer) — old enough that a row this age can
// never affect any live rate-limit check.
const PRUNE_MAX_AGE_SECONDS = 24 * 60 * 60
// Deleting on every single call would add a write to every rate-limited
// request; a 1-in-20 chance keeps the table bounded without that cost.
const PRUNE_PROBABILITY = 0.05

/**
 * Fixed-window rate limit backed by the rate_limit_events table (edge
 * functions are stateless, so there's no in-memory place to count
 * requests). Records the event unconditionally, then checks whether the
 * caller has exceeded maxEvents within the trailing windowSeconds.
 */
export async function checkAndRecordRateLimit(
  supabaseAdmin: SupabaseClient,
  key: string,
  windowSeconds: number,
  maxEvents: number,
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error: countError } = await supabaseAdmin
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart)

  if (countError) {
    // Fail open on a counting error — an outage in this table shouldn't
    // take down join/submit flows — but still record the attempt below.
    console.error('rate limit count error', countError)
  }

  await supabaseAdmin.from('rate_limit_events').insert({ key })

  // Opportunistic cleanup — this table has no other writer that would
  // ever prune it (see 0003_rate_limiting.sql's original "periodic
  // cleanup" comment, never implemented until now).
  if (Math.random() < PRUNE_PROBABILITY) {
    const pruneCutoff = new Date(Date.now() - PRUNE_MAX_AGE_SECONDS * 1000).toISOString()
    const { error: pruneError } = await supabaseAdmin
      .from('rate_limit_events')
      .delete()
      .lt('created_at', pruneCutoff)
    if (pruneError) {
      console.error('rate limit prune error', pruneError)
    }
  }

  const allowed = countError ? true : (count ?? 0) < maxEvents
  return { allowed }
}
