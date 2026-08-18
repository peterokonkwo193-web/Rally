-- Backing store for edge-function rate limiting. Edge functions are
-- stateless, so a per-IP/per-caller request count has to live somewhere —
-- this table is that somewhere. Rows are short-lived; a periodic cleanup
-- (or just the small table size at this scale) keeps it cheap.

create table rate_limit_events (
  id         uuid primary key default gen_random_uuid(),
  key        text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_key_created_idx
  on rate_limit_events (key, created_at);

alter table rate_limit_events enable row level security;
-- No policies: service-role only, same rationale as 0002_rls.sql.
