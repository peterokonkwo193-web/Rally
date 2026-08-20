import { requireSupabase } from './supabase'

export interface PublicQuiz {
  id: string
  title: string
  description: string
  questionCount: number
  categoryName: string | null
}

/** Public quiz metadata only — title/description/category/count. Never
 * touches questions/answer_options (rule 5 stays intact; see the RLS
 * policy in migration 0006 and CLAUDE.md's account-data-vs-game-data
 * note). Used by both the landing page preview and /discover. */
export async function fetchPublicQuizzes(limit: number): Promise<PublicQuiz[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, question_count, categories(name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not load quizzes.')
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    questionCount: row.question_count,
    // supabase-js can't infer a to-one vs to-many embed without generated
    // DB types, so it types this as an array either way — it's a plain
    // object at runtime for a belongs-to relation like this one.
    categoryName: (row.categories as unknown as { name: string } | null)?.name ?? null,
  }))
}

export interface CategoryName {
  id: string
  name: string
}

/** Real category names for the landing page's marquee strip — same
 * id/name/sort_order shape CreateSessionScreen already queries, not a new
 * shape. `categories` is public-read (CLAUDE.md rule 5's carve-out). */
export async function fetchCategoryNames(): Promise<CategoryName[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('sort_order', { ascending: true })
    .limit(100)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not load categories.')
  }

  return data
}

export interface LandingStats {
  categoryCount: number
  publicQuizCount: number
}

/** Real counts for the landing page's stats row — deliberately not
 * fabricated numbers. Both queries are head-only (no rows fetched, just
 * counts) against tables that are already publicly readable. */
export async function fetchLandingStats(): Promise<LandingStats> {
  const supabase = requireSupabase()
  const [categories, quizzes] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('is_public', true),
  ])
  return {
    categoryCount: categories.count ?? 0,
    publicQuizCount: quizzes.count ?? 0,
  }
}
