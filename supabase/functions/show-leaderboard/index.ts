import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'
import { loadOwnedSession } from '../_shared/session.ts'
import { broadcastToRoom } from '../_shared/broadcast.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const caller = createCallerClient(req.headers.get('Authorization'))
  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData?.user) {
    return errorResponse('UNAUTHENTICATED', 'You need to be logged in.', 401)
  }

  let body: { sessionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  if (!sessionId) {
    return errorResponse('INVALID_BODY', 'sessionId is required.', 400)
  }

  const admin = createAdminClient()
  const owned = await loadOwnedSession(admin, sessionId, userData.user.id)
  if (!owned.ok) {
    return errorResponse(
      owned.code,
      owned.code === 'FORBIDDEN'
        ? 'You do not own this session.'
        : 'Session not found.',
      owned.code === 'FORBIDDEN' ? 403 : 404,
    )
  }
  const session = owned.session as { status: string }

  if (session.status !== 'revealing') {
    return errorResponse(
      'INVALID_STATUS',
      `Cannot show the leaderboard from status "${session.status}".`,
      409,
    )
  }

  const { data: players, error: playersError } = await admin
    .from('players')
    .select('id, nickname, avatar_style, avatar_seed, score')
    .eq('session_id', sessionId)
    .order('score', { ascending: false })

  if (playersError || !players) {
    return errorResponse(
      'LEADERBOARD_FAILED',
      'Could not load the leaderboard.',
      500,
    )
  }

  const { error: updateError } = await admin
    .from('game_sessions')
    .update({ status: 'leaderboard' })
    .eq('id', sessionId)

  if (updateError) {
    console.error('show-leaderboard update error', updateError)
    return errorResponse(
      'LEADERBOARD_FAILED',
      'Could not show the leaderboard.',
      500,
    )
  }

  // Full ranked list, not just top 5 (see plan decision 2) — the payload
  // key `top` is kept from SPEC.md's original naming even though it's the
  // whole room; each client finds its own entry to learn its rank.
  const ranked = players.map((p, i) => ({
    playerId: p.id,
    nickname: p.nickname,
    avatarStyle: p.avatar_style,
    avatarSeed: p.avatar_seed,
    score: p.score,
    rank: i + 1,
  }))

  await broadcastToRoom(sessionId, 'leaderboard', { top: ranked })

  return jsonResponse({ top: ranked })
})
