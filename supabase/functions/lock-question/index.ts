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

  let body: { sessionId?: unknown; force?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const force = body.force === true
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
  const session = owned.session as {
    id: string
    status: string
    current_question_id: string | null
    question_ends_at: string | null
  }

  if (session.status !== 'question_active' || !session.current_question_id) {
    return errorResponse(
      'INVALID_STATUS',
      `Cannot lock a question from status "${session.status}".`,
      409,
    )
  }

  const [{ count: answered }, { count: total }] = await Promise.all([
    admin
      .from('player_answers')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('question_id', session.current_question_id),
    admin
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId),
  ])

  // Never trust the client's claim that "it's time" — the real trigger is
  // either the deadline having actually passed, or everyone having
  // actually answered (SPEC.md §5: "timer / all answered") — unless the
  // host explicitly force-skips (still ownership-checked above, still
  // only valid from question_active; this only relaxes the timing gate).
  const timeIsUp = new Date() >= new Date(session.question_ends_at as string)
  const allAnswered = (total ?? 0) > 0 && (answered ?? 0) >= (total ?? 0)
  if (!force && !timeIsUp && !allAnswered) {
    return errorResponse(
      'TOO_EARLY',
      'This question cannot be locked yet.',
      409,
    )
  }

  const { data: allPlayers } = await admin
    .from('players')
    .select('id')
    .eq('session_id', sessionId)
  const { data: answeredRows } = await admin
    .from('player_answers')
    .select('player_id, selected_option_id')
    .eq('session_id', sessionId)
    .eq('question_id', session.current_question_id)

  const answeredPlayerIds = new Set((answeredRows ?? []).map((r) => r.player_id))
  const nonAnsweredIds = (allPlayers ?? [])
    .map((p) => p.id)
    .filter((id) => !answeredPlayerIds.has(id))

  if (nonAnsweredIds.length > 0) {
    await admin.from('players').update({ streak: 0 }).in('id', nonAnsweredIds)
  }

  const { data: questionRow } = await admin
    .from('questions')
    .select('question_type')
    .eq('id', session.current_question_id)
    .maybeSingle()
  const questionType = questionRow?.question_type ?? 'multiple_choice'

  const { data: options } = await admin
    .from('answer_options')
    .select('id, position, text, is_correct')
    .eq('question_id', session.current_question_id)
    .order('position', { ascending: true })

  // Guarded on status = 'question_active' (not just id) — a double-click
  // or a genuine concurrent lock request that both passed the check above
  // would otherwise both flip the row and both broadcast question_end.
  const { data: updated, error: updateError } = await admin
    .from('game_sessions')
    .update({ status: 'revealing' })
    .eq('id', sessionId)
    .eq('status', 'question_active')
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('lock-question update error', updateError)
    return errorResponse('LOCK_FAILED', 'Could not lock the question.', 500)
  }
  if (!updated) {
    return errorResponse(
      'INVALID_STATUS',
      'This question was already locked by another request.',
      409,
    )
  }

  let payload: Record<string, unknown>
  if (questionType === 'type_answer') {
    // No fixed option grid for free text — a per-position distribution
    // doesn't mean anything here, so the reveal is accepted-answers +
    // a correct/incorrect split instead (SPEC §4/question-types plan).
    const correctCount = (answeredRows ?? []).filter((r) => r.selected_option_id !== null).length
    payload = {
      questionType,
      acceptedAnswers: (options ?? []).map((o) => o.text),
      correctCount,
      incorrectCount: (answeredRows ?? []).length - correctCount,
    }
  } else {
    // Position, not the raw option id — players only ever deal in
    // positions (0-3, the shape they tapped); the host resolves position
    // -> its own already-fetched option text/id for display. Nobody
    // client-side ever needs the real answer_options.id.
    const correctOption = (options ?? []).find((o) => o.is_correct)
    const distribution = (options ?? []).map(
      (o) =>
        (answeredRows ?? []).filter((r) => r.selected_option_id === o.id).length,
    )
    payload = {
      questionType,
      correctPosition: correctOption?.position ?? null,
      distribution,
    }
  }

  await broadcastToRoom(sessionId, 'question_end', payload)

  return jsonResponse(payload)
})
