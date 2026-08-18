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
