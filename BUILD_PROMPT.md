# Build Prompt — for Claude Code

Paste this whole thing into Claude Code (in plan mode) as your first message for the project. It assumes `SPEC.md` and `CLAUDE.md` already sit at the repo root — read them in full before writing any code.

---

## Prompt to paste

> Read `SPEC.md` and `CLAUDE.md` in full before doing anything else. This is a live multiplayer quiz platform, Kahoot-style: a host projects questions on a shared screen, players answer on their phones using only four coloured shapes, and scoring rewards speed. The two non-negotiable rules are that the server owns time (clients never send timestamps) and that the correct answer never reaches a player client before reveal.
>
> Build it in the milestone order defined in `SPEC.md` Section 10 (M1 – M6). Do not skip ahead to the quiz editor. Use plan mode and propose your approach before editing anything that spans multiple files, per `CLAUDE.md`'s working style section. One concern per change — don't bundle a bug fix with a refactor. Write tests with the logic, not after, especially for `scoring.ts` and any edge function.
>
> On top of the spec, hold the build to these additional bars — I want this to be a noticeably better product than Kahoot itself, not just a clone, specifically on UI polish, responsiveness, scale, and security.
>
> **1. UI / UX — must beat Kahoot on polish and responsiveness**
> - Host screen is desktop/projector-first: large type readable from the back of a room, high-contrast countdown, and a live "X of Y answered" counter that updates without layout shift.
> - Player screen is mobile-first and touch-first: four large colour/shape tap targets (red triangle, blue diamond, yellow circle, green square) sized for thumbs, with instant tap feedback (haptic-style visual pulse, not just a colour change) and zero layout shift when the screen orientation changes.
> - Every screen — lobby, question, reveal, leaderboard, podium — must be fully usable at common breakpoints from a 360px-wide phone up to a 1920px projector, with no horizontal scroll and no clipped text at any size. Test both portrait and landscape on the player screen.
> - Smooth, purposeful transitions between states (question → locked → reveal → leaderboard) using CSS transitions/Framer Motion — not jarring re-renders. Keep animations under ~300ms so pacing never feels sluggish.
> - Real accessibility: sufficient colour contrast on the four answer shapes for colour-blind players (shape + colour, never colour alone, exactly as spec'd), visible focus states, and countdown/timer information conveyed both visually and via text, not colour alone.
> - Every async action (join, submit, start question) has a visible loading and error state. No blank screens, no silent failures — this is already a `CLAUDE.md` rule; hold it strictly.
>
> **2. Scalability — must handle many concurrent sessions and large rooms**
> - Confirm the Supabase Realtime broadcast channel design (`room:{session_id}`) scales to at least a few hundred concurrent players per session without falling back to per-player polling anywhere.
> - Batch or throttle any broadcast that fires on every player action (e.g. `answer_count`) so a burst of simultaneous submissions doesn't flood the channel — debounce to a sensible interval (e.g. every 250–500ms) rather than broadcasting on every single write.
> - Use the indexes specified in `SPEC.md` Section 4 and add any others needed to keep `player_answers` and `players` queries fast as a session grows.
> - Address edge function cold starts explicitly: implement the warming call on lobby open that `CLAUDE.md` already flags as a gotcha, and note where else cold starts could hurt (first question of a session).
> - Design `submit-answer` and `start-question` so they stay correct under concurrent load — thirty players submitting in the same second is the expected case, not an edge case, per `SPEC.md` Section 12.
>
> **3. Security — must be meaningfully harder to cheat or breach than a typical implementation**
> - Enforce RLS on every table, with the `anon` role explicitly denied any direct read of `answer_options.is_correct` and `questions`. Write a test that opens the network/console as a player mid-question and confirms the correct answer is not retrievable from any payload, table, or API response before reveal — this is the spec's own acceptance test; automate it, don't just eyeball it.
> - All game-state mutations go through edge functions only; no table should have an RLS policy that lets a client write to `game_sessions`, `players`, or `player_answers` directly.
> - Every edge function validates the session's current status before acting (the state machine in `SPEC.md` Section 5) and rejects anything requiring host auth from a caller that doesn't own the session.
> - Rate-limit `join-session` per IP, and add rate limiting to `submit-answer` as well so a single client can't spam submissions or attempt to brute-force timing.
> - PIN generation must reject trivially guessable codes (`000000`, sequential digits, repeated digits) and must not be reusable for a still-active session.
> - Add a basic profanity filter on nicknames (flagged as a real requirement in `SPEC.md` Section 12, not optional for classroom use).
> - No secrets in frontend code, `.env` gitignored, service role key only ever used inside edge functions — confirm this with a grep-based check before considering any milestone done.
> - Sanitize all user-supplied text (nicknames, quiz/question text in the editor) against injection and XSS before it's ever rendered.
>
> Work through M1–M6 one at a time. After each milestone, run its acceptance test from `SPEC.md` Section 10 and tell me the result before moving on. Flag anything in `SPEC.md` or `CLAUDE.md` that seems to conflict with the UI, scalability, or security bars above rather than quietly working around it.

---

### Why this prompt is structured this way

- It forces Claude Code to treat `SPEC.md`/`CLAUDE.md` as the source of truth for game logic, data model, and build order — that's where the hard, load-bearing decisions (server-owned time, RLS, milestone sequencing) already live, and re-deriving them from scratch risks contradicting the spec.
- The four extra sections (UI, scalability, security) are additive constraints layered on top, phrased as bars to hold the existing plan to — not a rewrite of the architecture — so Claude Code doesn't discard the Supabase/edge-function design that the spec already justified.
- It asks for a milestone-by-milestone check-in with the acceptance tests already defined in the spec, so you get verifiable progress instead of a single large, hard-to-review drop.
