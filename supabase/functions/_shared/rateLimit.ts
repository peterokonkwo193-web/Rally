import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

  const allowed = countError ? true : (count ?? 0) < maxEvents
  return { allowed }
}
