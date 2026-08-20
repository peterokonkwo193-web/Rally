import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { generateValidPin } from '../_shared/pin.ts'
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'

const MAX_PIN_INSERT_ATTEMPTS = 5
// Generous — hosting many games in a session is normal use (testing,
// running back-to-back rounds); this is an abuse backstop against a
// script minting junk sessions/PINs, not a UX constraint real hosts hit.
const CREATE_SESSION_RATE_LIMIT_WINDOW_SECONDS = 3600
const CREATE_SESSION_RATE_LIMIT_MAX_EVENTS = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const authHeader = req.headers.get('Authorization')
  const caller = createCallerClient(authHeader)
  const { data: userData, error: userError } = await caller.auth.getUser()

  if (userError || !userData?.user) {
    return errorResponse(
      'UNAUTHENTICATED',
      'A host session is required to create a game.',
      401,
    )
  }

  const admin = createAdminClient()

  const { allowed } = await checkAndRecordRateLimit(
    admin,
    `create-session:${userData.user.id}`,
    CREATE_SESSION_RATE_LIMIT_WINDOW_SECONDS,
    CREATE_SESSION_RATE_LIMIT_MAX_EVENTS,
  )
  if (!allowed) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many sessions created recently. Try again later.',
      429,
    )
  }

  let body: { quizId?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // No body / non-JSON body is fine — falls back to the default quiz.
  }
  const requestedQuizId =
    typeof body.quizId === 'string' && body.quizId.length > 0
      ? body.quizId
      : null

  // With no quizId (e.g. no editor-created or generated quiz yet), fall
  // back to the earliest available quiz — originally the M1 seed fixture,
  // now typically whatever the most recently generated quiz is for a
  // fresh project.
  const quizQuery = requestedQuizId
    ? admin.from('quizzes').select('id').eq('id', requestedQuizId).maybeSingle()
    : admin
        .from('quizzes')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

  const { data: quiz, error: quizError } = await quizQuery

  if (quizError || !quiz) {
    return errorResponse(
      'NO_QUIZ_AVAILABLE',
      requestedQuizId
        ? 'That quiz could not be found.'
        : 'No quiz is available to host. Generate one first.',
      requestedQuizId ? 404 : 500,
    )
  }

  for (let attempt = 0; attempt < MAX_PIN_INSERT_ATTEMPTS; attempt++) {
    const pin = generateValidPin()

    const { data: session, error: insertError } = await admin
      .from('game_sessions')
      .insert({
        quiz_id: quiz.id,
        host_id: userData.user.id,
        pin,
        status: 'lobby',
      })
      .select('id, pin')
      .single()

    if (!insertError && session) {
      return jsonResponse({ sessionId: session.id, pin: session.pin })
    }

    // 23505 = unique_violation. Only the active-PIN collision is expected
    // here and worth retrying; anything else is a real failure.
    if (insertError && insertError.code !== '23505') {
      console.error('create-session insert error', insertError)
      return errorResponse(
        'CREATE_SESSION_FAILED',
        'Could not create the session.',
        500,
      )
    }
  }

  return errorResponse(
    'PIN_EXHAUSTED',
    'Could not find an available PIN. Try again.',
    503,
  )
})
