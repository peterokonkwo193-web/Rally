-- Adds real accounts (profiles), gender-based avatars, and quiz categories.
-- See the "Accounts, avatars, categories & AI quiz generation" plan for the
-- product decision behind this — it supersedes M1's anonymous-host /
-- anonymous-player-by-nickname design; both host and player now require a
-- logged-in account before doing anything else.

-- ── profiles ─────────────────────────────────────────────────────────────
-- One row per account, 1:1 with auth.users. Created client-side right
-- after signup (see src/lib/auth.ts) — allowed directly by RLS below
-- rather than routed through an edge function, since a user managing their
-- own single profile row is account data, not game data (CLAUDE.md rule 4
-- is scoped to game mutations).

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  gender       text not null check (gender in ('male', 'female')),
  avatar_style text not null default 'adventurer',
  avatar_seed  text not null,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are self-readable"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles are self-insertable"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles are self-updatable"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── categories ───────────────────────────────────────────────────────────

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  sort_order int not null default 0
);

alter table categories enable row level security;

-- Non-sensitive reference data — readable directly by any logged-in
-- client, unlike every game-state table.
create policy "categories are publicly readable"
  on categories for select
  using (true);

insert into categories (slug, name, sort_order) values
  ('general-knowledge', 'General Knowledge', 0),
  ('sports-football', 'Sports & Football', 1),
  ('movies-tv', 'Movies & TV', 2),
  ('music', 'Music', 3),
  ('social-media', 'Social Media & Pop Culture', 4),
  ('science-nature', 'Science & Nature', 5),
  ('history', 'History', 6),
  ('video-games', 'Video Games', 7);

-- ── quizzes.category_id ─────────────────────────────────────────────────

alter table quizzes
  add column category_id uuid references categories (id);

create index quizzes_category_id_idx on quizzes (category_id);

-- ── players: real identity + avatar snapshot ────────────────────────────
-- Snapshotting avatar_style/avatar_seed at join time (rather than joining
-- back to profiles on every read) keeps presence broadcasts self-contained
-- — each client already knows its own current avatar from its own profile.

-- The only existing rows at this point are M1's own verification fixtures
-- (curl/Playwright smoke tests), not real user data — clearing them so the
-- new user_id column can be a real NOT NULL constraint instead of a weaker
-- nullable-for-legacy-rows compromise.
truncate table player_answers, players, game_sessions cascade;

alter table players
  add column user_id uuid not null references auth.users (id),
  add column avatar_style text not null default 'adventurer',
  add column avatar_seed text not null default '';

create index players_user_id_idx on players (user_id);
