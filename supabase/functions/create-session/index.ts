import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { generateValidPin } from '../_shared/pin.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'

const MAX_PIN_INSERT_ATTEMPTS = 5

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
