-- Supports the game loop (SPEC.md M2-M4): question timing, answering,
-- scoring, reveal, leaderboard, podium.
--
-- Only one column needed — game_sessions already carries
-- current_question_id/idx and question_started_at/ends_at from M1's
-- initial schema, anticipating exactly this.

-- Coordination point for throttling the answer_count broadcast: edge
-- functions are stateless, so "at most one broadcast per ~300ms" (SPEC.md
-- §8) needs a shared place to claim the right to broadcast. submit-answer
-- does a single conditional UPDATE ... WHERE this column is stale enough,
-- and only the request that wins the row actually sends the broadcast.
alter table game_sessions
  add column last_answer_broadcast_at timestamptz;
