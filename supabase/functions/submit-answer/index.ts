import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'
import { calculateAnswerPoints } from '../_shared/scoring.ts'
import { broadcastToRoom } from '../_shared/broadcast.ts'
import { answerTextMatches } from '../_shared/textAnswer.ts'

// lock-question transitions directly from question_active to revealing
// (no separate question_locked stop — see the game-loop plan's decision
// 1). 'revealing' has to stay valid here too, or the SPEC.md §3.1/§12
// grace-window case — a legitimately in-flight answer arriving just after
// lock — would be rejected on status before the real timing check (now >
// question_ends_at + 300ms) ever runs. That timing check remains the sole
// authority; this is just the coarse "right question era" gate.
const VALID_FROM_STATUSES = ['question_active', 'revealing']
const GRACE_MS = 300
const BROADCAST_THROTTLE_MS = 300

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

  let body: { sessionId?: unknown; selectedPosition?: unknown; answerText?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const selectedPosition =
    typeof body.selectedPosition === 'number' ? body.selectedPosition : null
  const answerText =
    typeof body.answerText === 'string' && body.answerText.trim().length > 0
      ? body.answerText.trim().slice(0, 200)
      : null
  if (!sessionId || (selectedPosition === null && answerText === null)) {
    return errorResponse(
      'INVALID_BODY',
      'sessionId and either a selectedPosition or answerText are required.',
      400,
    )
  }

  const admin = createAdminClient()

  const { data: session, error: sessionError } = await admin
    .from('game_sessions')
    .select(
      'id, status, current_question_id, question_started_at, question_ends_at',
    )
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return errorResponse('SESSION_NOT_FOUND', 'Session not found.', 404)
  }
  if (!VALID_FROM_STATUSES.includes(session.status) || !session.current_question_id) {
    return errorResponse(
      'INVALID_STATUS',
      'There is no active question to answer.',
      409,
    )
  }

  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, streak, score')
    .eq('session_id', sessionId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (playerError || !player) {
    return errorResponse(
      'NOT_A_PLAYER',
      'You have not joined this session.',
      403,
    )
  }

  // Server owns time — the deadline is computed from the session's own
  // question_ends_at, never anything the client sends (SPEC.md §3.1).
  const now = new Date()
  const deadline = new Date(
    new Date(session.question_ends_at as string).getTime() + GRACE_MS,
  )
  if (now > deadline) {
    return errorResponse('DEADLINE_PASSED', 'Time is up for this question.', 409)
  }

  const { data: question, error: questionError } = await admin
    .from('questions')
    .select('time_limit_sec, points_factor, question_type')
    .eq('id', session.current_question_id)
    .maybeSingle()

  if (questionError || !question) {
    return errorResponse('SESSION_NOT_FOUND', 'Question not found.', 404)
  }

  let isCorrect: boolean
  let selectedOptionId: string | null = null
  let storedAnswerText: string | null = null

  if (question.question_type === 'type_answer') {
    if (answerText === null) {
      return errorResponse('INVALID_BODY', 'answerText is required for this question.', 400)
    }
    storedAnswerText = answerText
    // type_answer stores accepted answers as answer_options rows (all
    // is_correct=true, no fixed wrong-answer list — SPEC §4/the question
    // -types plan) — match against any of them.
    const { data: acceptedOptions, error: acceptedError } = await admin
      .from('answer_options')
      .select('id, text')
      .eq('question_id', session.current_question_id)

    if (acceptedError || !acceptedOptions) {
      return errorResponse('SUBMIT_FAILED', 'Could not validate your answer.', 500)
    }
    const match = acceptedOptions.find((o) => answerTextMatches(answerText, o.text))
    isCorrect = Boolean(match)
    selectedOptionId = match?.id ?? null
  } else {
    if (selectedPosition === null || selectedPosition < 0 || selectedPosition > 3) {
      return errorResponse('INVALID_BODY', 'A selectedPosition (0-3) is required.', 400)
    }
    // Players never learn real option ids (SPEC.md §3.2 — question_start
    // carries only optionCount) — they submit by position and the server
    // resolves it to a real answer_options row itself.
    const { data: option, error: optionError } = await admin
      .from('answer_options')
      .select('id, is_correct')
      .eq('question_id', session.current_question_id)
      .eq('position', selectedPosition)
      .maybeSingle()

    if (optionError || !option) {
      return errorResponse(
        'INVALID_OPTION',
        'That answer option is not valid for the current question.',
        400,
      )
    }
    isCorrect = option.is_correct
    selectedOptionId = option.id
  }

  const responseMs = now.getTime() - new Date(session.question_started_at as string).getTime()

  const { points, newStreak } = calculateAnswerPoints({
    isCorrect,
    responseMs,
    timeLimitSec: question.time_limit_sec,
    pointsFactor: question.points_factor,
    previousStreak: player.streak,
  })

  const { error: insertError } = await admin.from('player_answers').insert({
    session_id: sessionId,
    player_id: player.id,
    question_id: session.current_question_id,
    selected_option_id: selectedOptionId,
    answer_text: storedAnswerText,
    is_correct: isCorrect,
    response_ms: responseMs,
    points_awarded: points,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return errorResponse(
        'ALREADY_ANSWERED',
        'You already answered this question.',
        409,
      )
    }
    console.error('submit-answer insert error', insertError)
    return errorResponse('SUBMIT_FAILED', 'Could not submit your answer.', 500)
  }

  // Safe as a plain read-modify-write (score was read above): the
  // player_answers unique constraint means this player can't submit twice
  // for this question concurrently, and only one question is ever active
  // at a time, so there's no other writer racing this update.
  await admin
    .from('players')
    .update({ score: player.score + points, streak: newStreak })
    .eq('id', player.id)

  // Throttled answer_count broadcast (SPEC.md §8) — only the request that
  // wins the compare-and-swap on last_answer_broadcast_at actually sends
  // it, since edge functions have no shared in-memory state to throttle
  // with directly.
  const { data: claimed } = await admin
    .from('game_sessions')
    .update({ last_answer_broadcast_at: now.toISOString() })
    .eq('id', sessionId)
    .or(
      `last_answer_broadcast_at.is.null,last_answer_broadcast_at.lt.${new Date(
        now.getTime() - BROADCAST_THROTTLE_MS,
      ).toISOString()}`,
    )
    .select('id')
    .maybeSingle()

  if (claimed) {
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
    await broadcastToRoom(sessionId, 'answer_count', {
      answered: answered ?? 0,
      total: total ?? 0,
    })
  }

  return jsonResponse({ isCorrect, points, newStreak })
})
