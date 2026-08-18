import { requireSupabase } from './supabase'

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

type EdgeErrorBody = { error?: { code?: string; message?: string } }

/** Invokes an edge function and normalizes its `{ error: { code, message } }`
 * failure shape (CLAUDE.md's Errors convention) into a thrown ApiError, so
 * every call site gets one consistent way to catch and display failures.
 *
 * supabase-js treats any non-2xx response as a FunctionsHttpError with the
 * body only reachable via error.context (a Response) — it does NOT come
 * back through `data` the way a 2xx JSON error body would. Both paths are
 * handled here so callers never need to know the difference. */
export async function callEdgeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.functions.invoke<T | EdgeErrorBody>(
    name,
    { body },
  )

  if (error) {
    const context = (error as { context?: Response }).context
    let parsed: EdgeErrorBody | null = null
    if (context) {
      try {
        parsed = (await context.clone().json()) as EdgeErrorBody
      } catch {
        // context wasn't JSON — fall through to the generic message below.
      }
    }
    if (parsed?.error) {
      throw new ApiError(
        parsed.error.code ?? 'UNKNOWN',
        parsed.error.message ?? 'Something went wrong.',
      )
    }
    throw new ApiError('NETWORK_ERROR', error.message)
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    const { code, message } = (data as EdgeErrorBody).error!
    throw new ApiError(code ?? 'UNKNOWN', message ?? 'Something went wrong.')
  }
  return data as T
}
