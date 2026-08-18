import type { Session } from '@supabase/supabase-js'
import { requireSupabase } from './supabase'

export interface Profile {
  id: string
  displayName: string
  gender: 'male' | 'female'
  avatarStyle: string
  avatarSeed: string
}

function mapProfileRow(row: {
  id: string
  display_name: string
  gender: 'male' | 'female'
  avatar_style: string
  avatar_seed: string
}): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    gender: row.gender,
    avatarStyle: row.avatar_style,
    avatarSeed: row.avatar_seed,
  }
}

export interface ProfileInput {
  displayName: string
  gender: 'male' | 'female'
  avatarStyle: string
  avatarSeed: string
}

/** Self-service insert, allowed by the profiles RLS policy scoped to
 * auth.uid() = id — this is account data, not game data, so it doesn't
 * need to go through an edge function (CLAUDE.md rule 4 is about game
 * mutations). Also used to recover an account that authenticated
 * successfully but never got its profile row written (e.g. a network
 * blip between the two calls in signUp() below). */
export async function createProfile(
  userId: string,
  params: ProfileInput,
): Promise<Profile> {
  const supabase = requireSupabase()
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: params.displayName,
      gender: params.gender,
      avatar_style: params.avatarStyle,
      avatar_seed: params.avatarSeed,
    })
    .select('id, display_name, gender, avatar_style, avatar_seed')
    .single()

  if (profileError || !profileRow) {
    throw new Error(profileError?.message ?? 'Could not save your profile.')
  }

  return mapProfileRow(profileRow)
}

export async function signUp(
  params: ProfileInput & { email: string; password: string },
): Promise<Profile> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  })
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Could not create an account.')
  }

  return createProfile(data.user.id, params)
}

export async function login(params: {
  email: string
  password: string
}): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signInWithPassword(params)
  if (error) {
    throw new Error(error.message)
  }
}

export async function logout(): Promise<void> {
  const supabase = requireSupabase()
  await supabase.auth.signOut()
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = requireSupabase()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, gender, avatar_style, avatar_seed')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  return mapProfileRow(data)
}

/** Fires immediately with the current session, then again on every
 * login/logout/token-refresh. Returns the unsubscribe function. */
export function subscribeToAuthState(
  onChange: (session: Session | null) => void,
): () => void {
  const supabase = requireSupabase()
  supabase.auth.getSession().then(({ data }) => onChange(data.session))
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session)
  })
  return () => listener.subscription.unsubscribe()
}
