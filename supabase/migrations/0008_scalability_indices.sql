-- Supports checkAndRecordRateLimit's opportunistic pruning of old
-- rate_limit_events rows (_shared/rateLimit.ts) — that delete filters on
-- created_at alone, not (key, created_at), so it needs its own index
-- rather than relying on the existing composite one.
create index rate_limit_events_created_at_idx
  on rate_limit_events (created_at);

-- Supports fetchPublicQuizzes/fetchLandingStats (src/lib/discover.ts) and
-- the "public quizzes are readable" RLS policy (0006_discover.sql), all of
-- which filter/order on exactly this shape.
create index quizzes_public_created_at_idx
  on quizzes (created_at desc) where is_public = true;
