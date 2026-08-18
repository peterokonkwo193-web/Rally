import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'
import { loadOwnedSession } from '../_shared/session.ts'
import { broadcastToRoom } from '../_shared/broadcast.ts'

const VALID_FROM_STATUSES = ['lobby', 'leaderboard']

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
  const session = owned.session as {
    id: string
    quiz_id: string
    status: string
    current_question_idx: number
  }

  if (!VALID_FROM_STATUSES.includes(session.status)) {
    return errorResponse(
      'INVALID_STATUS',
      `Cannot start a question from status "${session.status}".`,
      409,
    )
  }

  const { data: questions, error: questionsError } = await admin
    .from('questions')
    .select('id, text, time_limit_sec, points_factor, position, question_type')
    .eq('quiz_id', session.quiz_id)
    .order('position', { ascending: true })

  if (questionsError || !questions || questions.length === 0) {
    return errorResponse('NO_QUESTIONS', 'This quiz has no questions.', 500)
  }

  const nextIdx = session.current_question_idx + 1
  const question = questions[nextIdx]
  if (!question) {
    return errorResponse(
      'NO_MORE_QUESTIONS',
      'There are no more questions in this quiz.',
      409,
    )
  }

  const { data: options, error: optionsError } = await admin
    .from('answer_options')
    .select('id, position, text')
    .eq('question_id', question.id)
    .order('position', { ascending: true })

  if (optionsError || !options) {
    return errorResponse(
      'START_QUESTION_FAILED',
      'Could not load answer options.',
      500,
    )
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + question.time_limit_sec * 1000)

  const { error: updateError } = await admin
    .from('game_sessions')
    .update({
      current_question_id: question.id,
      current_question_idx: nextIdx,
      question_started_at: now.toISOString(),
      question_ends_at: endsAt.toISOString(),
      status: 'question_active',
      last_answer_broadcast_at: null,
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('start-question update error', updateError)
    return errorResponse(
      'START_QUESTION_FAILED',
      'Could not start the question.',
      500,
    )
  }

  await broadcastToRoom(sessionId, 'question_start', {
    questionIdx: nextIdx,
    questionType: question.question_type,
    optionCount: options.length,
    endsAt: endsAt.toISOString(),
    serverNow: now.toISOString(),
  })

  return jsonResponse({
    questionIdx: nextIdx,
    totalQuestions: questions.length,
    endsAt: endsAt.toISOString(),
    serverNow: now.toISOString(),
    question: {
      id: question.id,
      text: question.text,
      timeLimitSec: question.time_limit_sec,
      pointsFactor: question.points_factor,
      questionType: question.question_type,
    },
    options: options.map((o) => ({ id: o.id, position: o.position, text: o.text })),
  })
})
