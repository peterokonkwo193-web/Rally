import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  containsProfanity,
  InvalidNicknameError,
  normalizeNickname,
} from '../_shared/nickname.ts'
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'

const PIN_PATTERN = /^[0-9]{6}$/
const JOIN_RATE_LIMIT_WINDOW_SECONDS = 60
const JOIN_RATE_LIMIT_MAX_EVENTS = 20

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
      'You need to be logged in to join a game.',
      401,
    )
  }

  const admin = createAdminClient()

  // Rate limit per account now that anonymous access is gone — a real
  // login is a much more meaningful throttle key than an IP address.
  const { allowed } = await checkAndRecordRateLimit(
    admin,
    `join:${userData.user.id}`,
    JOIN_RATE_LIMIT_WINDOW_SECONDS,
    JOIN_RATE_LIMIT_MAX_EVENTS,
  )
  if (!allowed) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many join attempts. Wait a moment and try again.',
      429,
    )
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('display_name, avatar_style, avatar_seed')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return errorResponse(
      'PROFILE_MISSING',
      'Your account is missing a profile. Please finish signup.',
      409,
    )
  }

  let body: { pin?: unknown; nickname?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }

  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
  if (!PIN_PATTERN.test(pin)) {
    return errorResponse('INVALID_PIN', 'That PIN is not valid.', 400)
  }

  // Nickname normally comes straight from the account's profile — a
  // player never has to type one. The body may still carry an explicit
  // override, used only to recover from a same-session name collision
  // (see the DUPLICATE_NICKNAME branch below).
  const rawNickname =
    typeof body.nickname === 'string' && body.nickname.trim().length > 0
      ? body.nickname
      : profile.display_name

  let nickname: string
  try {
    nickname = normalizeNickname(rawNickname)
  } catch (err) {
    if (err instanceof InvalidNicknameError) {
      return errorResponse('INVALID_NICKNAME', err.message, 400)
    }
    throw err
  }

  if (containsProfanity(nickname)) {
    return errorResponse(
      'INAPPROPRIATE_NICKNAME',
      'Please choose a different nickname.',
      400,
    )
  }

  const { data: session, error: sessionError } = await admin
    .from('game_sessions')
    .select('id, status')
    .eq('pin', pin)
    .is('ended_at', null)
    .maybeSingle()

  if (sessionError) {
    console.error('join-session lookup error', sessionError)
    return errorResponse('JOIN_FAILED', 'Could not join the session.', 500)
  }
  if (!session) {
    return errorResponse('INVALID_PIN', 'No active game with that PIN.', 404)
  }
  if (session.status !== 'lobby') {
    return errorResponse(
      'GAME_ALREADY_STARTED',
      'This game has already started.',
      409,
    )
  }

  const { data: player, error: insertError } = await admin
    .from('players')
    .insert({
      session_id: session.id,
      user_id: userData.user.id,
      nickname,
      avatar_style: profile.avatar_style,
      avatar_seed: profile.avatar_seed,
    })
    .select('id, client_token')
    .single()

  if (insertError) {
    if (insertError.message?.includes('players_session_nickname_key')) {
      return errorResponse(
        'DUPLICATE_NICKNAME',
        'That nickname is already taken in this game.',
        409,
      )
    }
    console.error('join-session insert error', insertError)
    return errorResponse('JOIN_FAILED', 'Could not join the session.', 500)
  }

  return jsonResponse({
    playerId: player.id,
    clientToken: player.client_token,
    sessionId: session.id,
    nickname,
    avatarStyle: profile.avatar_style,
    avatarSeed: profile.avatar_seed,
  })
})
