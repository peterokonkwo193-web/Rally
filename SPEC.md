# SPEC — Live Multiplayer Quiz Platform

A Kahoot-style app: a host projects questions on a shared screen, players answer on their phones, scoring rewards speed.

---

## 1. Product shape

**Two clients, one game.**

- **Host screen** (laptop, projected): question text, the four answer options, a countdown, a live count of how many have answered, then the correct answer and the leaderboard.
- **Player screen** (phone): on join, then the question text and the four large coloured shapes — red triangle, blue diamond, yellow circle, green square — each labelled with its option text. Players tap a shape on their own device; no separate shared screen is required to read the question.

**Superseded from the original design:** the player screen originally showed shapes only, with no question or option text, deliberately forcing players to read off a shared host screen the way real Kahoot works. That's been relaxed by explicit product decision — the question and option text are now sent to the player's own device too (§3.2, §8). What has **not** changed, and remains the real security property: players still never receive a real `answer_options.id`, and correctness is still never sent before reveal.

**Superseded from the original design:** both host and player now require a real account (§4a) — signed up or logged in before anything else, **but only once you actually try to host or join** — rather than the host-only anonymous session and nickname-only anonymous player join originally described here. Nickname and avatar come from the account's profile instead of being typed at join time; a nickname can still be overridden for a single game if it collides with someone already in that session. `/` and `/discover` (§4b) are public and require no account at all — the account requirement is scoped to `/host` and `/play`, not the whole site. Early on, `App.tsx` wrapped literally everything in the login gate, including what would have been the very first page a visitor ever saw — that's specifically what §4b fixes.

**Game flow:**

```
Host creates session → PIN displayed → players join lobby
  ↓
Host starts game
  ↓
┌─ Question shown, timer runs, players answer
│  ↓
│  Timer expires or all answered → answers locked
│  ↓
│  Correct answer revealed + answer distribution
│  ↓
│  Leaderboard (top 5)
│  ↓
└─ Host clicks next → repeat
  ↓
Final podium
```

Players never advance the game. The host does. All pacing is host-controlled.

---

## 2. Stack

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Supabase — Postgres, Realtime (broadcast + presence), Edge Functions (Deno)
- **Hosting:** Vercel or Netlify
- **State:** Zustand for client game state. No Redux.

Rationale: Supabase Realtime broadcast gives sub-100ms fan-out without running a server. Edge functions give a trusted execution context for scoring. If this outgrows Supabase, the migration target is Node + Socket.IO + Redis, but that's premature now.

---

## 3. The two rules that make or break this

### 3.1 The server owns time

Never trust a client-reported response time. A player on hotel wifi gets unfairly punished; a player with dev tools open can claim they answered in 2ms.

**How it works:**

1. Host triggers `start-question`. The edge function writes `question_started_at = now()` (Postgres time) and `question_ends_at = now() + time_limit` to `game_sessions`, then broadcasts `question_start` carrying `endsAt` and `serverNow`.
2. Each client computes `clockOffset = serverNow - Date.now()` on receipt and renders its countdown against the corrected clock. The countdown is **display only**.
3. Player submits. The `submit-answer` edge function computes `response_ms = now() - question_started_at` from server time, rejects anything past `question_ends_at` plus a 300ms grace window, and awards points.

The client never sends a timestamp. It sends a question ID and an option ID; nothing else.

### 3.2 Players must not be able to read the correct answer

`answer_options.is_correct` is the crown jewel. The Supabase anon key ships in browser code — if a player can query that column, the game is over.

**Therefore:**

- RLS denies the `anon` role all direct access to `answer_options` and `questions`.
- Players receive question payloads only through the broadcast channel. Those payloads now include the question text and each option's text (position-keyed, product decision — see §1's superseded note), but still carry no real `answer_options.id` and no correctness flags.
- The correct option ID is broadcast only at reveal, after answers are locked.
- The host client fetches full question data through an authenticated edge function that verifies it owns the session.

Test this by opening the console on a player device mid-question and trying to read the answer. If you can, fix it before doing anything else.

---

## 4. Data model

```
quizzes
  id              uuid pk
  owner_id        uuid → auth.users
  category_id     uuid → categories, null
  title           text
  description     text
  is_public       boolean default false
  created_at      timestamptz
  updated_at      timestamptz

questions
  id              uuid pk
  quiz_id         uuid → quizzes on delete cascade
  position        int                     -- order within quiz
  text            text
  image_url       text null
  time_limit_sec  int default 20          -- 5,10,20,30,60,90
  points_factor   numeric default 1.0     -- 0 = no points, 2 = double
  question_type   text default 'multiple_choice'
                  -- 'multiple_choice' | 'true_false' | 'type_answer', see §4c
  created_at      timestamptz
  unique (quiz_id, position)

answer_options
  id              uuid pk
  question_id     uuid → questions on delete cascade
  position        int     -- 0..3; multiple_choice/true_false: shape/colour
                  -- slot. type_answer: no positional meaning, just row order
  text            text
  is_correct      boolean -- type_answer: true for every row (every row is an
                  -- accepted answer variant, there's no fixed wrong-answer list)
  unique (question_id, position)

game_sessions
  id                    uuid pk
  quiz_id               uuid → quizzes
  host_id               uuid → auth.users
  pin                   text                 -- 6 digits; unique only among active sessions (see §7)
  status                text                 -- see state machine
  current_question_id   uuid null → questions
  current_question_idx  int default -1
  question_started_at   timestamptz null
  question_ends_at      timestamptz null
  created_at            timestamptz
  ended_at              timestamptz null

players
  id              uuid pk
  session_id      uuid → game_sessions on delete cascade
  user_id         uuid → auth.users              -- the logged-in account behind this player
  nickname        text                            -- defaults from profiles.display_name; may be
                                                    -- overridden for this one game on collision
  avatar_style    text                            -- snapshot of profiles.avatar_style at join time
  avatar_seed     text                            -- snapshot of profiles.avatar_seed at join time
  client_token    uuid            -- localStorage; identity for reconnect
  score           int default 0
  streak          int default 0
  connected       boolean default true
  joined_at       timestamptz
  last_seen_at    timestamptz
  unique (session_id, client_token)
  -- case-insensitive nickname uniqueness enforced via a partial/expression
  -- unique index (see §7 migrations note), not a table-level UNIQUE —
  -- lower(nickname) is an expression and table-level UNIQUE only takes column names

player_answers
  id                  uuid pk
  session_id          uuid → game_sessions on delete cascade
  player_id           uuid → players on delete cascade
  question_id         uuid → questions
  selected_option_id  uuid → answer_options, null
                      -- null for a WRONG type_answer submission — there's no
                      -- option row to point at when nothing matched (§4c)
  answer_text         text null   -- raw typed text; type_answer submissions only
  is_correct          boolean
  response_ms         int
  points_awarded      int
  created_at          timestamptz
  unique (player_id, question_id)     -- prevents double submission
```

That last unique constraint is the double-submit defence. Enforce it in the database, not in application code.

Indexes: `players(session_id)`, `players(session_id, lower(nickname))` (unique), `player_answers(session_id, question_id)`, `game_sessions(pin) where ended_at is null` (unique), `players(user_id)`, `quizzes(category_id)`.

---

## 4a. Accounts, avatars & categories

Both host and player require a real account — this is the one deliberate reversal of this document's original "players are anonymous, nickname only" design (§1). Rationale: a persistent identity is what makes per-account avatars possible, and lets "anybody host again" mean something durable rather than a throwaway anonymous session.

```
profiles                                    -- one row per account, 1:1 with auth.users
  id            uuid pk → auth.users
  display_name  text
  gender        text check (gender in ('male','female'))
  avatar_style  text default 'avataaars'    -- DiceBear style
  avatar_seed   text                         -- auto-assigned at random from a curated per-gender set
  created_at    timestamptz

categories
  id         uuid pk
  slug       text unique
  name       text
  sort_order int default 0
```

**Signup flow:** email + password + display name → pick male or female → account created immediately, no email confirmation step (Supabase Auth's `mailer_autoconfirm` is on for this project — `signUp()` returns a live session straight away). There is no avatar-picking step: the moment a gender is tapped, a character is assigned automatically at random from that gender's curated set and signup completes in the same action — nobody chooses their own avatar. Avatar art is generated on demand via DiceBear (`https://api.dicebear.com`), not hand-drawn assets — a seed string is all that's stored; the image is rendered by URL wherever an avatar appears (roster, waiting screen). The two per-gender seed sets are curated by appearance (picked by rendering a batch and eyeballing which read as clearly male-/female-presenting in the `avataaars` style), not by any semantic meaning in the seed string itself.

**RLS on `profiles`, as a deliberate exception to "zero policies" elsewhere:** self-only `select`/`insert`/`update` (`auth.uid() = id`). This is account data a user manages directly, not game state — CLAUDE.md's "all game mutations go through edge functions" rule is scoped to the six game tables above, not this one. No policy ever lets one account read another's profile row; the in-game roster gets nickname/avatar from each player's own Presence broadcast, never a cross-account table read. `categories` gets one public `select` policy — non-sensitive reference data.

**Quiz generation:** any logged-in user can generate a full quiz for a category (optionally with a free-text topic) via the `generate-quiz` edge function (§7), which calls an LLM to produce questions server-side and inserts them exactly like a hand-authored quiz would — the client never sees or trusts model output directly, and the same "no scoring/correctness logic reaches the client before reveal" rule (§3.2) applies regardless of whether a human or a model wrote the question. Generated quizzes default to **`is_public = true`** (superseded from an earlier `false` default written before §4b's Discover existed — see below) — the host's category/topic form has a "Share this quiz publicly" checkbox, checked by default, so it stays an explicit, visible, opt-out-able choice rather than a silent default.

---

## 4b. Public landing page & Discover

`/` and `/discover` require no account — `AuthGate` doesn't wrap either route (`src/App.tsx`). `/host` and `/play` are unchanged, still behind `AuthGate`. This split exists because the account requirement is meant to gate *hosting and joining*, not *finding out what Rally is* — a visitor's very first load shouldn't be a login form with no context.

- **`/` (`LandingPage`):** logo, tagline, "Host a Game" (`/host`) / "Join a Game" (`/play`) CTAs, a short benefits section, and a preview of a few public quizzes pulled from the same source as Discover.
- **`/discover` (`DiscoverScreen`):** every `is_public = true` quiz, newest first, as cards (title, category, question count). No pagination or search yet — a flat list is enough at current content volume; add them when that stops being true, not before. Each card links to `/host?quizId=<id>` — `CreateSessionScreen` checks for a `quizId` query param on mount and, if present, calls `create-session` directly with it, skipping the category/topic/generate step entirely. If the visitor isn't logged in yet, `/host`'s own `AuthGate` handles that exactly as it would for any other visit — no special-casing needed.
- **What's exposed, and why it's safe:** only non-sensitive quiz metadata — `title`, `description`, `category_id` → `categories.name`, and a denormalized `quizzes.question_count`. `question_count` is set once by `generate-quiz` at insert time specifically so Discover never has to query `questions` itself — that table (and `answer_options`) still has zero RLS policies, exactly as locked down as day one (rule 5). The new RLS policy is narrow: `quizzes` gets one public `select using (is_public = true)` policy, mirroring `categories`' existing public-read policy from §4a.

---

## 4c. Question types, host controls, sound & podium celebration

Four Kahoot features layered onto the M2–M4 game loop, none of which change the two non-negotiable rules (§3) — correctness still never reaches a player before reveal, the server still owns every timing decision.

**Three question types**, `questions.question_type`:
- `multiple_choice` (default, unchanged from M2–M4): 4 `answer_options`, one `is_correct`.
- `true_false`: exactly 2 `answer_options` ("True" at position 0, "False" at position 1). Reuses `submit-answer`'s existing `selectedPosition` path completely unchanged — the server never needed to know it was true/false rather than 4-way multiple choice, only the *display* differs (a dedicated two-button component, not the 4-shape grid — "which shape means true" has no established meaning).
- `type_answer`: 1-3 `answer_options`, **all** `is_correct = true` — there's no fixed wrong-answer list for free text, only accepted variants (e.g. "Au" / "AU" / "au"). Players submit `{sessionId, answerText}` instead of a position; the server normalizes (trim, lowercase, collapse whitespace — `_shared/textAnswer.ts`) and compares against every accepted variant. A non-match still needs to persist *something* for that player_answer row: `selected_option_id` is null, `answer_text` holds what they actually typed (§4's schema note). `lock-question`'s reveal payload is shaped differently for this type too — `{acceptedAnswers, correctCount, incorrectCount}` rather than `{correctPosition, distribution}`, since a per-position bar chart doesn't mean anything for free text.

`generate-quiz` asks for a natural mix of all three per quiz (not forced proportions) — confirmed in practice to actually produce a mix, not just multiple_choice.

**Host controls**, both moderation actions, neither gated by the session state machine (kicking or skipping is legitimate at any point, not just from specific statuses):
- **`kick-player`** — host-only, ownership-checked, deletes the `players` row (cascades `player_answers` — a kicked player's history leaving with them is correct, not data loss) and broadcasts `player_kicked {playerId}`. Every client receives it; only the one whose own id matches reacts, with a terminal "you were removed" screen. Available from the lobby roster and the leaderboard (the two moments a host is actually looking at a player list).
- **Skip Question** — `lock-question` accepts an optional `force: true` that bypasses the `TOO_EARLY` check (still fully ownership- and status-checked otherwise). The client-side "Skip Question" button is just a trigger; the server doesn't trust it any more than it trusts the normal auto-lock timer.
- **Not built:** true pause/resume — correctly tracking elapsed active-time across a pause boundary to keep `question_ends_at` honest is materially bigger than a one-shot skip. Noted as a deliberate cut, not an oversight.

**Sound** (`src/lib/sound.ts`): every effect (countdown tick, correct chime, wrong buzz, host reveal chime, podium fanfare) is synthesized via the Web Audio API — oscillators and gain envelopes, no audio files, no licensing question, no new dependency. A `localStorage`-persisted mute toggle sits on the two entry screens (`/host`'s and `/play`'s headers) — sound is a global preference, not something that needs its own control on every phase view. No continuous background lobby music — synthesized "music" reads as cheap rather than ambient; the discrete effects are the higher-value, more recognizably-Kahoot piece.

**Podium celebration** (`src/components/Confetti.tsx`): ~60 CSS-animated particles, no canvas, no library, runs once per podium mount (not looping).

---

## 5. Session state machine

```
lobby ─────────────► question_active ───────► question_locked
  ▲                     │                        │
  │                     │ (timer / all answered) │
  │                     ▼                        ▼
  │                                          revealing
  │                                              │
  │                                              ▼
  └───────────────── leaderboard ◄───────────────┘
                          │
                          ▼ (no questions left)
                      finished
```

Model this explicitly as a `status` column with a check constraint. Every edge function validates the current status before acting — `start-question` only works from `lobby` or `leaderboard`. `submit-answer` accepts from `question_active` **and** `revealing`, not `question_locked` — as built, `lock-question` transitions directly `question_active → revealing` in one action (there's no separate window where status is literally `question_locked`; distribution/correct-answer computation and the lock happen together, timer- or all-answered-triggered, never a second host click). `revealing` is what has to stay valid in `submit-answer`'s status check for the same reason §3.1's grace window exists — a legitimately in-flight answer landing just after lock shouldn't be rejected on status before the real timing check (`question_ends_at + 300ms`, still the sole timing authority) ever runs. `question_locked` remains in the `status` check constraint for forward-compatibility but nothing currently sets it.

Advancing off `revealing` to `leaderboard`, and off `leaderboard` to the next question or `finished`, are both explicit host actions ("Show Leaderboard" / "Next Question" / "Final Results" button clicks) — SPEC §1's "all pacing is host-controlled" is the reason nothing auto-advances past the reveal screen.

---

## 6. Scoring

Correct answers only. Wrong answers score zero.

```
base       = 1000 × points_factor
timeRatio  = response_ms / (time_limit_sec × 1000)     -- clamped 0..1
points     = round(base × (1 − timeRatio / 2))
```

So an instant correct answer earns the full 1000, scaled by `points_factor`; one landing exactly on the buzzer earns half that. Speed matters, but a slow correct answer always beats a fast wrong one — that ratio is deliberate and worth keeping.

**Streak bonus:** on a correct answer, increment `streak`, then add `min(streak − 1, 5) × 100`. A wrong answer or a timeout resets `streak` to 0. `points_factor = 0` still pays the streak bonus by design (base is zero, the bonus is independent) — a zero-point question still rewards keeping a streak alive.

Timeouts don't run through `submit-answer` (nothing was submitted), so streak resets for players who didn't answer happen inside `lock-question`, not `submit-answer`: for every player in the session with no `player_answers` row for the question just locked, set `streak = 0`.

All scoring happens inside `submit-answer`. No scoring logic in the client, ever — not even a preview.

---

## 7. Edge functions

| Function | Caller | Does |
|---|---|---|
| `create-session` | host (auth'd) | Generates unique PIN, creates session in `lobby`; optional `quizId` (falls back to the earliest available quiz) |
| `join-session` | player (auth'd) | Validates PIN, pulls nickname/avatar from the caller's `profiles` row (optional override on collision), creates player, returns `player_id` + `client_token` |
| `generate-quiz` | any auth'd user | Calls an LLM for a category (+ optional topic), asks for a mix of question types (§4c), validates the structured result, inserts a new quiz/questions/options owned by the caller |
| `rejoin-session` | player (auth'd) | Looks up player by `client_token`, returns current state |
| `start-question` | host | Advances index, sets server timestamps, broadcasts `question_start` (now includes `questionType`, §4c), **returns full question+options in its HTTP response** (this response is the "host fetches full question data through an authenticated edge function" from §3.2 — no separate fetch) |
| `submit-answer` | player | Player submits a **position (0-3)** for `multiple_choice`/`true_false`, or `answerText` for `type_answer` — never a real option id either way. Validates window, scores, writes `player_answers`, updates `players.score`, broadcasts throttled `answer_count` |
| `lock-question` | host, timer-triggered or force-skipped (§4c) | Re-validates server-side that the deadline has actually passed or everyone has actually answered — unless `force: true` (host-triggered skip, still ownership-checked). Resets streaks for non-answerers, moves straight to `revealing` with a type-shaped reveal payload (§4c) |
| `show-leaderboard` | host | Broadcasts the full ranked list (not just top 5 — see §8); each client finds its own entry for its rank |
| `end-session` | host | Final podium, sets `ended_at` |
| `kick-player` | host | Removes a player from the session (§4c), broadcasts `player_kicked` |

**PIN generation:** random 6 digits, retry on collision, unique only among sessions where `ended_at is null` so codes can be reused later (enforced by the partial unique index in §4, not a plain column constraint). Reject `000000`, other repeated-digit codes (`111111`...`999999`), and simple sequences (`123456`, `654321`).

**Rate limiting:** cap `join-session` and `generate-quiz` per account, and `submit-answer` per player, backed by a small `rate_limit_events` table (edge functions are stateless — there is no in-memory place to count requests). `generate-quiz` calls a paid LLM API per request, so its cap matters even with accounts in place — an unthrottled "anybody can generate" endpoint is a real cost target, not just an abuse one.

**Host reconnect / dead host:** there is no server-side cron firing `lock-question` — in practice the host's own countdown triggers it. If the host tab dies mid-question, nothing calls it. `rejoin-session` (host path) and host page load must therefore check for a session whose `question_ends_at` is in the past and still `question_active`, and call `lock-question` immediately. This is what makes "kill the host tab mid-question" (§9) actually pass.

---

## 8. Realtime channels

One broadcast channel per session: `room:{session_id}` (not the PIN — the PIN is guessable).

**Server → all:**

| Event | Payload |
|---|---|
| `player_joined` | `{ playerId, nickname }` |
| `player_left` | `{ playerId }` |
| `question_start` | `{ questionIdx, questionType, text, optionCount, options: [{position, text}], endsAt, serverNow }` |
| `answer_count` | `{ answered, total }` — aggregate only, never who; throttled to at most one broadcast per 250–500ms even under a burst of simultaneous submissions |
| `question_end` | `multiple_choice`/`true_false`: `{ questionType, correctPosition, distribution: [n,n,n,n] }` — position (0-3), not a raw `answer_options.id`, players never handle real option ids. `type_answer`: `{ questionType, acceptedAnswers: string[], correctCount, incorrectCount }` instead — no position grid for free text (§4c) |
| `leaderboard` | `{ top: [{playerId, nickname, score}] }` broadcast, plus each connecting client resolves its own rank client-side from the full list, or via a targeted per-player fetch if the roster is large (see §12 note on room size) |
| `game_over` | `{ podium: [...] }` |
| `player_kicked` | `{ playerId }` — every client gets it, only the matching one reacts (§4c) |

Note `question_start` carries question text and option text (product decision, §1) but never a real `answer_options.id` — `options` is keyed by position only, same as the host's own authenticated fetch is keyed by id.

**Presence** on the same channel tracks who's currently connected for the lobby roster and the connected/disconnected indicator. Presence is authoritative for the live "connected" state; `players.connected`/`last_seen_at` in Postgres is only a last-known fallback used by `rejoin-session`, not a second live source of truth.

---

## 9. Reconnection

Assume phones lock, tabs sleep, and wifi drops. This is normal traffic, not an edge case.

- On join, the player's `client_token` goes to `localStorage`.
- On load, if a token exists for an active session, call `rejoin-session`.
- The response returns current status, the player's score, and — if a question is active — the remaining time and whether they've already answered.
- A player who missed a question entirely gets no points for it and their streak resets (see §6 — handled in `lock-question`, not on the eventual reconnect). Don't retroactively award anything.
- The host reconnecting is more serious: the session must survive it completely, since the game state lives in Postgres rather than in host memory. Concretely, host `rejoin-session` must detect and self-heal a question whose `question_ends_at` has already passed (see §7). Test it by killing the host tab mid-question.

---

## 10. Build order

Do these in order. Each has an acceptance test you must actually run.

**M1 — Lobby.** Host creates a session and sees a PIN. Players join by PIN with a nickname and appear on the host screen in real time. No questions at all.
*Accept:* three phones join; all three appear on the host screen within a second; a duplicate nickname is rejected.

**M2 — One hardcoded question. ✅ Built.** Host triggers it, both screens react, countdown runs in sync.
*Accept:* host and player countdowns stay within 500ms of each other across three devices. Verified live via a real deployed session: `start-question` returns `endsAt`/`serverNow` used identically by both the host's own countdown and every player's, both computed from the same `computeClockOffset` (`src/lib/clock.ts`).

**M3 — Answering and scoring. ✅ Built.** Submission, server-side timing, points, reveal.
*Accept:* two players answer correctly 2s apart; the faster one scores higher; a submission after the deadline is rejected; a double submission is rejected. All four verified live: a 4-second-slower correct answer scored 934 vs. 990 for the faster one (same question); a post-deadline submission returned `DEADLINE_PASSED`; a repeat submission returned `ALREADY_ANSWERED` (409, the `player_answers` unique constraint); a submission after the host had already advanced to `leaderboard` returned `INVALID_STATUS`.

**M4 — Full loop. ✅ Built.** Leaderboard between questions, next question, final podium.
*Accept:* a full multi-question game runs start to finish without a refresh. Verified live end-to-end (2-question fixture quiz — lobby → question → reveal → leaderboard → question 2 → reveal → leaderboard → podium) via both direct edge-function calls and a real browser driven through every phase transition by live broadcasts, screenshotted at each step.

**M5 — Quiz editor.** CRUD for quizzes and questions, marking the correct option, reordering.
*Accept:* a quiz created in the UI can be played through end to end.

**M6 — Hardening.** Reconnection, host disconnect, rate limiting, empty states, error states.
*Accept:* a player force-quits mid-game, rejoins, and finishes with the correct score.

**Build the editor at M5, not first.** It's the comfortable, familiar part and it teaches you nothing about whether the realtime layer works. Find that out at M1, when it's cheap.

---

## 11. Testing

Unit tests are mandatory for the scoring function — it's pure, it's the heart of the game, and it's trivially testable. Cover: instant answer, buzzer-beater, wrong answer, streak accumulation, streak reset, `points_factor` of 0 and 2.

Integration tests for the edge functions: submission after deadline, double submission, submission to a locked question, join with a duplicate nickname, join with an invalid PIN.

Manual multi-device testing is not optional. Two browser tabs will not reveal the problems that three phones on real wifi will.

---

## 12. Known hard parts

Listed so they're not a surprise:

- **Clock skew** across devices. Handled by the offset calculation, but verify it on a phone that's been awake for days. Note the offset as computed (`serverNow - Date.now()`) doesn't correct for one-way broadcast transit latency, so corrected clocks run slightly ahead of true server time by roughly that latency — acceptable at the ~500ms tolerance in M2, but the reason if that test ever gets tightened.
- **Simultaneous submission** — thirty writes in the same second. The unique constraint handles correctness; watch for edge function cold starts.
- **The reveal race** — a player's answer arriving while the host is locking the question. Status checks inside a transaction resolve this, combined with `submit-answer` accepting from `question_locked` as described in §5 so a legitimately-in-flight answer isn't punished for the race itself — only for missing the real deadline.
- **Nickname abuse.** A profanity filter is a real requirement for anything used in a classroom, not a nice-to-have.
- **Cold starts** on edge functions adding latency to the first question. Consider a warming call when the host opens the lobby.
- **Large rooms.** At a few hundred concurrent players, broadcasting the full leaderboard array to everyone on every `show-leaderboard` call is cheap; recomputing every player's individual rank via `count(*) where score >` on each request is not — index `players(session_id, score desc)` if per-rank lookups become a bottleneck.
