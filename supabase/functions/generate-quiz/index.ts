import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { checkAndRecordRateLimit } from '../_shared/rateLimit.ts'
import {
  createAdminClient,
  createCallerClient,
} from '../_shared/supabaseAdmin.ts'

// An alias Google keeps pointed at their current recommended fast model,
// not a pinned version — avoids hard-coding a model name that goes stale
// and 404s once Google deprecates it (which is exactly what happened with
// the first version of this file, pinned to 'gemini-2.0-flash').
const GEMINI_MODEL = 'gemini-flash-latest'
const ALLOWED_TIME_LIMITS = new Set([5, 10, 20, 30, 60, 90])
const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 20
const DEFAULT_QUESTIONS = 20

const GENERATE_RATE_LIMIT_WINDOW_SECONDS = 3600
const GENERATE_RATE_LIMIT_MAX_EVENTS = 20

// Gemini's "controlled generation" — responseMimeType + responseSchema —
// is the Gemini analog of Anthropic's forced tool-use: the model is
// constrained to emit JSON matching this shape, no prose-JSON parsing.
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'type_answer'] as const
type QuestionType = (typeof QUESTION_TYPES)[number]

const QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'A short, catchy quiz title.' },
    questions: {
      type: 'ARRAY',
      minItems: MIN_QUESTIONS,
      maxItems: MAX_QUESTIONS,
      items: {
        type: 'OBJECT',
        properties: {
          questionType: {
            type: 'STRING',
            enum: [...QUESTION_TYPES],
            description:
              'multiple_choice: 4 options, one correct. true_false: exactly 2 options, ' +
              '"True" and "False". type_answer: 1-3 short accepted-answer text variants, ' +
              'no wrong options — correctIndex is ignored for this type.',
          },
          text: { type: 'STRING' },
          timeLimitSec: {
            type: 'INTEGER',
            description: 'One of 5, 10, 20, 30, 60, or 90.',
          },
          options: {
            type: 'ARRAY',
            minItems: 1,
            maxItems: 4,
            items: { type: 'STRING' },
          },
          correctIndex: { type: 'INTEGER' },
        },
        required: ['questionType', 'text', 'options'],
      },
    },
  },
  required: ['title', 'questions'],
}

interface GeneratedQuestion {
  questionType: QuestionType
  text: string
  timeLimitSec?: number
  options: string[]
  correctIndex: number
}

interface GeneratedQuiz {
  title: string
  questions: GeneratedQuestion[]
}

function isValidGeneratedQuestion(q: Partial<GeneratedQuestion>): boolean {
  if (typeof q.text !== 'string' || q.text.trim().length === 0) return false
  if (!QUESTION_TYPES.includes(q.questionType as QuestionType)) return false
  if (!Array.isArray(q.options)) return false
  if (!q.options.every((o) => typeof o === 'string' && o.trim().length > 0)) return false
  if (q.timeLimitSec !== undefined && !ALLOWED_TIME_LIMITS.has(q.timeLimitSec)) {
    return false
  }

  switch (q.questionType) {
    case 'multiple_choice':
      return (
        q.options.length === 4 &&
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
      )
    case 'true_false':
      return (
        q.options.length === 2 &&
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 1
      )
    case 'type_answer':
      // correctIndex is meaningless here — every option is an accepted
      // answer variant (see generate-quiz's insert logic).
      return q.options.length >= 1 && q.options.length <= 3
    default:
      return false
  }
}

function isValidGeneratedQuiz(value: unknown): value is GeneratedQuiz {
  if (!value || typeof value !== 'object') return false
  const quiz = value as Partial<GeneratedQuiz>
  if (typeof quiz.title !== 'string' || quiz.title.trim().length === 0) return false
  if (!Array.isArray(quiz.questions)) return false
  if (quiz.questions.length < MIN_QUESTIONS || quiz.questions.length > MAX_QUESTIONS) {
    return false
  }
  return quiz.questions.every(isValidGeneratedQuestion)
}

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
      'You need to be logged in to generate a quiz.',
      401,
    )
  }

  const admin = createAdminClient()

  const { allowed } = await checkAndRecordRateLimit(
    admin,
    `generate-quiz:${userData.user.id}`,
    GENERATE_RATE_LIMIT_WINDOW_SECONDS,
    GENERATE_RATE_LIMIT_MAX_EVENTS,
  )
  if (!allowed) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many quizzes generated recently. Try again later.',
      429,
    )
  }

  let body: { categoryId?: unknown; topic?: unknown; questionCount?: unknown; isPublic?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('INVALID_BODY', 'Expected a JSON body.', 400)
  }

  const categoryId = typeof body.categoryId === 'string' ? body.categoryId : null
  if (!categoryId) {
    return errorResponse('INVALID_CATEGORY', 'A categoryId is required.', 400)
  }

  const { data: category, error: categoryError } = await admin
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .maybeSingle()

  if (categoryError || !category) {
    return errorResponse('INVALID_CATEGORY', 'That category was not found.', 404)
  }

  const topic = typeof body.topic === 'string' && body.topic.trim().length > 0
    ? body.topic.trim().slice(0, 200)
    : null

  const requestedCount =
    typeof body.questionCount === 'number' ? Math.round(body.questionCount) : DEFAULT_QUESTIONS
  const questionCount = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, requestedCount))

  // Defaults to public — Discover needs real content to browse, and a
  // generated trivia quiz isn't sensitive. Still an explicit, visible,
  // opt-out-able choice on the host's form, not a silent default.
  const isPublic = body.isPublic !== false

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    console.error('generate-quiz: GEMINI_API_KEY is not set')
    return errorResponse(
      'GENERATION_UNAVAILABLE',
      'Quiz generation is not configured on the server.',
      500,
    )
  }

  const subject = topic ? `${category.name} — ${topic}` : category.name
  const userPrompt =
    `Write ${questionCount} trivia questions for a Kahoot-style party quiz game ` +
    `on the subject: "${subject}". Use a natural mix of question types, mostly ` +
    `multiple_choice with a few true_false and type_answer sprinkled in ` +
    `(not every quiz needs all three, use your judgment for what fits the ` +
    `subject). For multiple_choice: exactly 4 short options, one correct. ` +
    `For true_false: exactly 2 options, "True" and "False". For type_answer: ` +
    `1-3 short accepted-answer text variants (e.g. ["Paris"] or ["Mount ` +
    `Everest", "Everest"]), no wrong options, ignore correctIndex. Keep ` +
    `questions fun, broadly accessible, and factually accurate. Vary ` +
    `difficulty. Suggest a timeLimitSec of 20 for most questions, 30 for ` +
    `harder ones or type_answer questions (typing takes longer than tapping).`

  // Gemini returns a transient 503 "high demand" fairly routinely (seen
  // directly while building this) — worth one quick retry before giving
  // up, since the very next request often just succeeds.
  const GEMINI_MAX_ATTEMPTS = 3
  let geminiRes: Response | null = null
  let lastErrorBody = ''
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: QUIZ_RESPONSE_SCHEMA,
            },
          }),
        },
      )
      if (res.ok) {
        geminiRes = res
        break
      }
      if (res.status !== 503 || attempt === GEMINI_MAX_ATTEMPTS) {
        lastErrorBody = await res.text().catch(() => '')
        console.error('generate-quiz: Gemini returned', res.status, lastErrorBody)
        return errorResponse('GENERATION_FAILED', 'The quiz generator failed. Try again.', 502)
      }
      // 503 (transient overload) and attempts remain — brief backoff, retry.
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    } catch (err) {
      console.error('generate-quiz: Gemini request failed', err)
      return errorResponse('GENERATION_FAILED', 'Could not reach the quiz generator.', 502)
    }
  }

  if (!geminiRes) {
    console.error('generate-quiz: Gemini exhausted retries', lastErrorBody)
    return errorResponse('GENERATION_FAILED', 'The quiz generator failed. Try again.', 502)
  }

  const geminiBody = await geminiRes.json()
  // Unlike Anthropic's tool-use (which returns already-parsed JSON),
  // Gemini's structured output still comes back as a JSON *string* inside
  // the first candidate's text part — has to be parsed here.
  const rawText: string | undefined = geminiBody?.candidates?.[0]?.content?.parts?.[0]?.text

  let parsed: unknown = null
  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    } catch (err) {
      console.error('generate-quiz: could not parse Gemini output as JSON', err, rawText)
    }
  }

  if (!isValidGeneratedQuiz(parsed)) {
    console.error('generate-quiz: malformed generation result', geminiBody)
    return errorResponse(
      'GENERATION_FAILED',
      'The quiz generator returned something unusable. Try again.',
      502,
    )
  }

  const generated = parsed

  const { data: quiz, error: quizInsertError } = await admin
    .from('quizzes')
    .insert({
      owner_id: userData.user.id,
      category_id: category.id,
      title: generated.title.trim(),
      description: topic ?? category.name,
      is_public: isPublic,
      question_count: generated.questions.length,
    })
    .select('id')
    .single()

  if (quizInsertError || !quiz) {
    console.error('generate-quiz: quiz insert failed', quizInsertError)
    return errorResponse('GENERATION_FAILED', 'Could not save the generated quiz.', 500)
  }

  for (let i = 0; i < generated.questions.length; i++) {
    const q = generated.questions[i]
    const { data: question, error: questionError } = await admin
      .from('questions')
      .insert({
        quiz_id: quiz.id,
        position: i,
        text: q.text.trim(),
        time_limit_sec: q.timeLimitSec ?? 20,
        question_type: q.questionType,
      })
      .select('id')
      .single()

    if (questionError || !question) {
      console.error('generate-quiz: question insert failed', questionError)
      return errorResponse('GENERATION_FAILED', 'Could not save the generated quiz.', 500)
    }

    // type_answer has no fixed wrong-answer list — every option is an
    // accepted answer variant. The other two types keep the usual
    // "only the option at correctIndex is right" shape.
    const { error: optionsError } = await admin.from('answer_options').insert(
      q.options.map((text, position) => ({
        question_id: question.id,
        position,
        text: text.trim(),
        is_correct: q.questionType === 'type_answer' ? true : position === q.correctIndex,
      })),
    )

    if (optionsError) {
      console.error('generate-quiz: options insert failed', optionsError)
      return errorResponse('GENERATION_FAILED', 'Could not save the generated quiz.', 500)
    }
  }

  return jsonResponse({ quizId: quiz.id, title: generated.title, questionCount: generated.questions.length })
})
