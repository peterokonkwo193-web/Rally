# CLAUDE.md

Live multiplayer quiz platform — Kahoot-style. Host projects questions on a shared screen; players answer on phones; scoring rewards speed.

Full technical spec is in `SPEC.md`. **Read it before proposing any change that touches game flow, scoring, or the data model.**

---

## Stack

- React + Vite + TypeScript (strict mode)
- Tailwind for styling — no CSS modules, no styled-components
- Zustand for client game state
- Supabase: Postgres, Realtime (broadcast + presence), Edge Functions (Deno)
- Vitest + React Testing Library
- Deployed on Vercel

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run test         # vitest
npm run test:watch   # vitest watch
npm run lint         # eslint
supabase start       # local supabase
supabase functions serve   # local edge functions
```

---

## Non-negotiable rules

These come from the spec and are not open to convenience-based reinterpretation.

**1. The server owns time.** Clients never send timestamps. `response_ms` is always computed inside an edge function from `now() - question_started_at`. Client countdowns are display only.

**2. Correct answers never reach the player client.** `answer_options.is_correct` is unreadable by the `anon` role. The correct option ID is sent only at reveal, after answers lock. Question broadcasts to players *do* carry question text and option text (superseded from the original "shapes only, read the shared host screen" design — SPEC.md §1 — by explicit product decision), but never a real `answer_options.id` and never correctness data pre-reveal; that's the part of this rule that actually matters and stays enforced.

**3. All scoring happens in `submit-answer`.** No scoring logic in the client — not even a preview or an optimistic update. There is exactly one implementation of the scoring function, and it lives in `supabase/functions/_shared/scoring.ts` (Deno-importable from every edge function that needs it). It is not duplicated into `src/`; a client-side copy is itself a violation of this rule no matter how it's labeled.

**4. All game mutations go through edge functions.** The client never writes to `game_sessions`, `players`, or `player_answers` directly.

**5. RLS is enabled on every table.** No exceptions. A table without RLS is a public table. `profiles` (self-only select/insert/update) and `categories` (public select) are the one deliberate carve-out from "zero policies" — they're account/reference data a user manages directly or reads freely, not game state, so rule 4 doesn't apply to them. See SPEC.md §4a for the reasoning. Every other table stays at zero direct-access policies.

**5a. Both host and player require a logged-in account.** SPEC.md's original anonymous-host / anonymous-player-by-nickname design is superseded (§4a, §1). Nickname and avatar come from the account's `profiles` row, not typed fresh each time.

**6. Secrets never touch frontend code.** Service role key and any third-party keys live in edge function secrets. `.env` is gitignored.

**7. Every edge function validates session status before acting.** `submit-answer` runs from `question_active` or `question_locked` (the §5/§3.1 grace window); `start-question` only from `lobby` or `leaderboard`.

---

## Conventions

**Structure:**

```
src/
  components/     # dumb, presentational (RallyLogo, etc.)
  features/
    auth/         # AuthGate + signup/login/avatar-picker, gates the whole app
    host/         # host screen
    player/       # player screen
    editor/       # quiz editor
  lib/
    supabase.ts   # client singleton
    auth.ts       # signUp/login/logout/profile helpers
    avatars.ts    # DiceBear seed pools + avatarUrl()
    realtime.ts   # channel subscription helpers
    clock.ts      # server clock-offset helpers (display-only countdowns)
  stores/         # zustand
  types/          # shared types, generated db types
supabase/
  functions/
    _shared/
      scoring.ts  # the one scoring implementation, tested directly, imported by submit-answer and lock-question
  migrations/
```

**Naming:** components `PascalCase.tsx`, everything else `camelCase.ts`. Hooks `useThing`. Database columns `snake_case`; TypeScript `camelCase`; map at the boundary in `lib/`, never scatter conversions through components.

**Types:** generate database types with `supabase gen types typescript`. Don't hand-write table types. No `any` — use `unknown` and narrow.

**State:** server state lives in Postgres and arrives via realtime. Zustand holds only derived UI state. Don't duplicate authoritative game state client-side.

**Errors:** every edge function returns `{ error: { code, message } }` on failure with a proper status code. Every UI surface that can fail has a visible error state. "The page went blank" is a bug.

**Migrations:** schema changes are always a migration file in `supabase/migrations/`. Never edit the database through the dashboard and leave the repo out of sync.

---

## Working style

**Use plan mode for anything spanning multiple files.** Propose the approach before editing.

**One concern per change.** Don't bundle a bug fix with a refactor.

**Write the test with the logic**, not after — especially for anything in `scoring.ts` or an edge function.

**Don't add dependencies without asking.** This stack is deliberately small.

**Don't reorganise files you weren't asked to touch.**

**When something in this file or `SPEC.md` seems wrong, say so** rather than silently working around it. If a rule genuinely blocks a correct implementation, that's worth a conversation.

---

## Current state

Milestone: **M1–M4 done and verified**, plus a public landing page + Discover (SPEC.md §4b) and question types/host controls/sound/podium celebration (§4c) — all out of the original document order, all explicitly requested ahead of schedule.

Working: the whole core game loop, end to end — session creation with PIN, live lobby roster via presence, email/password signup+login gating `/host` and `/play` only (no email confirmation step), gender-based avatar auto-assignment (DiceBear), quiz categories, AI-generated quizzes via `generate-quiz` (**Gemini**, not Anthropic — see the gotcha below on why — public by default with an opt-out), host flow "pick category → Generate & Host", then question display with a synced countdown, three question types (multiple_choice/true_false/type_answer), server-side scoring with streaks, reveal with distribution, leaderboard, multi-question loop, and a final podium with confetti. Host moderation (kick a player, force-skip a question) and synthesized sound effects with a persisted mute toggle are both in. Realtime is architected as one persistent per-session channel (`useGameChannel`) rather than a subscription per screen — see the gotcha below. `/` and `/discover` are public, no account needed — see the gotcha below on why that split matters. The landing page (`src/features/landing/LandingPage.tsx`) got two decoration passes since launch: real content sections first (how-it-works, benefit cards, discover preview, real stats via `fetchLandingStats`), then a "fill the empty background" pass — `GradientBlobs` + `FloatingShapes` now span the full page (not just the hero) behind everything at `z-10`, `WaveDivider` SVGs replace flat section borders, `CategoryMarquee` scrolls real category names, `DeviceMockup` illustrates "project on a screen / answer on your phone" using the real `ANSWER_SHAPES` system, and a static "Built for" use-case chip row. Everything numeric on the page stays real-data-backed (no fabricated stats/testimonials/social proof) — see the gotcha below on why `useCountUp` needed a clock fix to actually animate those numbers reliably.

Next: M5 — quiz editor (hand-authoring/editing quizzes by CRUD, not just AI generation).

Not started: full editor, reconnection (M6), true pause/resume (deliberate cut, see SPEC.md §4c — a one-shot skip shipped instead). Discover has no pagination/search yet (stated scope cut, not an oversight).

<!-- Keep this section current. It's the fastest way to orient a new session. -->

---

## Gotchas found so far

<!-- Add to this whenever you catch the same mistake twice. -->

- Supabase Realtime broadcast requires `{ config: { broadcast: { self: true } } }` if the sender also needs to receive its own events. The host does.
- Edge function cold starts add noticeable latency to the first call of a session. Warm on lobby open.
- `unique (a, lower(b))` is not valid Postgres table-level syntax — table `UNIQUE` only takes column names. Case-insensitive nickname uniqueness needs a standalone expression index (see `SPEC.md` §4/§7 and the migration that creates `players`).
- DiceBear's `adventurer` style barely varies by perceived gender regardless of seed — nearly androgynous across a random batch. `avataaars` actually has legible gendered features (hair, facial hair). If picking avatar seeds again, render a batch and eyeball it — don't assume a "male-sounding" seed string renders male; DiceBear seeds are opaque hashes, the string itself means nothing.
- For any edge function that needs structured output from an LLM, force it rather than asking for JSON in prose and parsing that: Anthropic's Messages API does this via forced tool-use (`tool_choice: {type:'tool', name:...}`, `input` arrives already-parsed); Gemini does it via `generationConfig: {responseMimeType: 'application/json', responseSchema: {...}}` — but Gemini's version still comes back as a JSON *string* inside `candidates[0].content.parts[0].text`, needs an explicit `JSON.parse()`, unlike Anthropic's already-parsed `input`. Don't assume the two are parsed the same way.
- `generate-quiz` calls **Gemini**, not Anthropic/Claude — the user didn't have an Anthropic account (API access needs billing set up at console.anthropic.com; Gemini's aistudio.google.com key didn't). Secret is `GEMINI_API_KEY`, not `ANTHROPIC_API_KEY`. Two things that actually broke while wiring this up, worth not repeating: (1) a pinned model name (`gemini-2.0-flash`) 404'd — it had been deprecated since this session's training cutoff; use an evergreen alias like `gemini-flash-latest` instead of a pinned version for exactly this reason. (2) Gemini returns a transient `503` "high demand" routinely, not as a rare edge case — `generate-quiz` retries up to 3 times on a 503 specifically (not other error codes) with a short backoff before giving up.
- Supabase Auth's `mailer_autoconfirm` defaults to **off** on a new project — `supabase.auth.signUp()` then returns `data.user` but `data.session === null` until the user clicks an email link, so any code (like `createProfile()`) that assumes an active session right after signup silently fails on a fresh project. Check/set this via the Management API (`GET`/`PATCH .../config/auth`) or the dashboard (Authentication → Providers → Email) before relying on signup-then-immediately-authenticated behavior. This project has it set to `true`.
- Players never get real `answer_options.id` values, at any point — only a position (0-3). `submit-answer` takes `selectedPosition`, resolves it to the real row server-side; `lock-question` broadcasts `correctPosition`, not an id. Simpler than it sounds and it's the only way `question_start`'s "no option ids" constraint (SPEC §3.2/§8) actually holds — if a broadcast or response ever needs to hand a player something that identifies an option, it should be the position, never the id.
- Don't give a screen (host or player) its own realtime channel subscription once there's more than one phase to render. Subscribe exactly once, register every broadcast listener up front (`channel.on()` has to run before `.subscribe()` anyway), and let phase-specific components just read from the store. Retrofitting this after M1 (`useGameChannel`) was a real refactor — worth getting right from the start next time.
- Edge functions are stateless, so "throttle this broadcast to ~1 per 300ms" needs a real coordination point, not an in-memory flag. Pattern used for `answer_count`: one nullable timestamp column, claimed via a single conditional `UPDATE ... WHERE col < now() - interval WHERE ... RETURNING id` — only the request that gets a row back actually broadcasts.
- `lock-question` transitions `question_active` straight to `revealing` (no separate `question_locked` stop) — SPEC's state diagram implies a `question_locked` step but the two things it would do (lock, then compute+reveal) happen atomically together here. `submit-answer`'s grace-window status check has to allow `revealing`, not `question_locked`, or the exact race SPEC §12 calls out (an in-flight answer arriving just after lock) gets wrongly rejected on status before the real timing check runs. Caught this only by testing the race live — the bug is invisible in the happy path.
- Supabase Auth's own signup rate limit (not something this project configures) throws a real `429` after a handful of signups from the same IP in a short window, independent of anything in this codebase. For repeated test-account creation, use the Admin API (`POST /auth/v1/admin/users` with the service-role key) instead of the public signup endpoint — it isn't subject to the same throttle.
- Don't reach for `<AuthGate>` at the very top of the component tree by default — wrap it around the specific routes that actually need an account (`/host`, `/play`), not the whole app. Wrapping everything meant the very first thing any visitor ever saw was a login form with zero context, before there was anywhere public to explain what the app even is. Caught this from a real user complaint, not from testing — nothing in the test suite would have flagged a page that "works," just gates something that shouldn't be gated.
- In Vite **dev mode**, first-load-after-navigation can take several real seconds (each component gets transformed/served on demand, not pre-bundled) even though the underlying API calls are fast (measured: auth + profile fetch well under 2s combined). A screen sitting on static "Logging in…" text for 5-10s reads as broken even when it's just compiling. Production builds don't have this per-module overhead, but the UX gap is real either way — any multi-second async action should show a spinner plus a "still working" message after ~2-3s (`useDelayedFlag`, `src/lib/useDelayedFlag.ts`), not just static text.
- `player_answers.selected_option_id` had to go **nullable** to support `type_answer` questions — a wrong free-text submission genuinely has no `answer_options` row to point at (that table only stores accepted variants for this type, not a fixed wrong-answer list). `answer_text` carries the raw typed text instead, null for the other two question types. If a future question type needs the same "sometimes there's no matching row" shape, this is the pattern: nullable FK + a sibling column for the raw value, not a placeholder row.
- Test accounts reused across sessions keep whatever `display_name` they were last left with by an *earlier* verification pass (e.g. a duplicate-nickname test deliberately sets two accounts to the same name) — this bit the "two players join the same session" live-verification flow twice now: a join fails with a real `DUPLICATE_NICKNAME` that looks like a bug but is stale test-account state, not a regression. Check `profiles.display_name` for the accounts actually being used before assuming a collision is a real bug.
- Host moderation actions (`kick-player`, `lock-question`'s `force` skip) deliberately have **no session-status gate** — unlike every game-state-mutating function, which validates status before acting (rule 7). Moderation is orthogonal to the state machine: a host can legitimately want to remove someone or skip a question from any state the game happens to be in.
- `useCountUp` (`src/lib/useCountUp.ts`) originally timed its animation frame-to-frame using the timestamp `requestAnimationFrame` hands its callback, diffed against a `performance.now()` taken at effect-start. In jsdom (vitest's test environment) those two clocks don't share an origin, so `now - start` came out nonsensical and the animation never reliably reached its target — a landing-page stats test timed out waiting for "8 categories" to render, not because the data was wrong but because the animated number never got there. Fixed by timing with `Date.now()` on both ends instead of trusting the rAF callback's own timestamp arg. If another rAF-driven animation gets added, use the same self-consistent-clock pattern rather than mixing `performance.now()` and the callback timestamp.
- The Vercel deploy had no `vercel.json`, and `App.tsx` routes purely by reading `window.location.pathname` (no router library, SPEC's stack list has none). That combination means a fresh browser load of `/play`, `/host`, or `/discover` — a shared join link opened cold, not a click from `/` — hits Vercel's static file server before the app's own JS ever runs, and there's no file at that path, so Vercel returns its own 404 instead of `index.html`. Fixed with a catch-all rewrite (`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`) so every path falls back to the SPA shell unless a real static file matches first (Vercel checks the filesystem before applying rewrites, so this doesn't break `/assets/*`). If a router ever gets added, keep the rewrite anyway — client-side routing always needs it on Vercel.
- `CreateSessionScreen`'s direct-host-a-quiz effect (`directQuizId` → `create-session`, for `/host?quizId=...` links from Discover/landing) had no idempotency guard beyond its dependency array. React 18 StrictMode double-invokes mount effects in dev specifically to catch exactly this — and it did: two real sessions/PINs got created from one page load, and `useGameChannel` joined the first session's realtime channel and then immediately abandoned it for the second's. Fixed with a `useRef` guard so the effect body only ever runs once regardless of how many times React invokes it. While fixing this, also hardened `useGameChannel` itself: its channel-status callbacks now check a `stale` flag set by the effect's own cleanup, so a torn-down channel's late `CLOSED`/`CHANNEL_ERROR` status can never overwrite `connectionStatus` for whatever channel is current — otherwise a stale callback firing after a sessionId change could flip a genuinely-connected lobby to showing "Lost connection" for no real reason. Any future one-shot mount effect that calls a creating/mutating edge function needs the same ref guard, not just a dependency array.
- The above race-condition fix turned out not to be the actual cause of a real "Lost connection to the lobby" report on the live Vercel deployment — it reproduced locally as a dev-only StrictMode artifact but the production error persisted after that fix shipped. Diagnosed by driving the real host flow against the production URL with Playwright and inspecting the websocket directly: the Realtime connection's `socketerror` was `HTTP Authentication failed; no valid credentials available`, and the failing request's `apikey` query param visibly ended in `%0A` — a URL-encoded trailing newline. `VITE_SUPABASE_ANON_KEY` had been pasted into Vercel's env var UI with a trailing newline baked in. REST calls and edge function calls (key sent as an `Authorization` header) worked fine regardless — HTTP header values get trimmed — which is exactly why session creation/PIN generation succeeded while only the realtime websocket (key sent in the URL query string, never trimmed) failed; that split symptom is the tell for this specific bug. Fixed defensively in code, not just by re-pasting the env var: `src/lib/supabase.ts` now does `import.meta.env.VITE_SUPABASE_URL?.trim()` / `.VITE_SUPABASE_ANON_KEY?.trim()` before constructing the client, so the app is robust to this regardless of how any future env var gets pasted into any dashboard. If a "some Supabase calls work, others silently don't, no useful error" report ever recurs, check for whitespace in the env var before assuming it's a code bug.
