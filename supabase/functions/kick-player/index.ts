import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'
import { loadOwnedSession } from '../_shared/session.ts'
import { broadcastToRoom } from '../_shared/broadcast.ts'

// Deliberately no session-status gate — moderation isn't part of the game
// state machine. A host can remove someone from the lobby just as
// legitimately as mid-game (SPEC.md §12: nickname/behavior abuse is a
// real classroom requirement, not a nice-to-have).
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

  let body: { sessionId?: unknown; playerId?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const playerId = typeof body.playerId === 'string' ? body.playerId : null
  if (!sessionId || !playerId) {
    return errorResponse('INVALID_BODY', 'sessionId and playerId are required.', 400)
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

  // Cascades player_answers (SPEC.md §4) — a kicked player's history
  // going with them is correct here, not a data-loss concern.
  const { data: deleted, error: deleteError } = await admin
    .from('players')
    .delete()
    .eq('id', playerId)
    .eq('session_id', sessionId)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    console.error('kick-player delete error', deleteError)
    return errorResponse('KICK_FAILED', 'Could not remove that player.', 500)
  }
  if (!deleted) {
    return errorResponse('PLAYER_NOT_FOUND', 'That player is not in this session.', 404)
  }

  await broadcastToRoom(sessionId, 'player_kicked', { playerId })

  return jsonResponse({ playerId })
})
