-- Initial schema for the live multiplayer quiz platform.
-- See SPEC.md §4 for the data model this implements and the rationale
-- behind each constraint.

create extension if not exists "pgcrypto";

-- ── quizzes ──────────────────────────────────────────────────────────────

create table quizzes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text not null default '',
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index quizzes_owner_id_idx on quizzes (owner_id);

-- ── questions ────────────────────────────────────────────────────────────

create table questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references quizzes (id) on delete cascade,
  position       int not null,
  text           text not null,
  image_url      text,
  time_limit_sec int not null default 20
    check (time_limit_sec in (5, 10, 20, 30, 60, 90)),
  points_factor  numeric not null default 1.0 check (points_factor >= 0),
  created_at     timestamptz not null default now(),
  unique (quiz_id, position)
);

create index questions_quiz_id_idx on questions (quiz_id);

-- ── answer_options ───────────────────────────────────────────────────────

create table answer_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  position    int not null check (position between 0 and 3),
  text        text not null,
  is_correct  boolean not null default false,
  unique (question_id, position)
);

create index answer_options_question_id_idx on answer_options (question_id);

-- ── game_sessions ────────────────────────────────────────────────────────

create table game_sessions (
  id                    uuid primary key default gen_random_uuid(),
  quiz_id               uuid not null references quizzes (id),
  host_id               uuid not null references auth.users (id),
  pin                   text not null check (pin ~ '^[0-9]{6}$'),
  status                text not null default 'lobby'
    check (status in (
      'lobby', 'question_active', 'question_locked',
      'revealing', 'leaderboard', 'finished'
    )),
  current_question_id  uuid references questions (id),
  current_question_idx int not null default -1,
  question_started_at  timestamptz,
  question_ends_at      timestamptz,
  created_at            timestamptz not null default now(),
  ended_at               timestamptz
);

-- Codes are unique only while a session is still active, so a PIN can be
-- reused once a game ends (SPEC.md §7). This must be a partial index, not a
-- plain column-level UNIQUE, or reuse is impossible.
create unique index game_sessions_active_pin_key
  on game_sessions (pin) where ended_at is null;

create index game_sessions_host_id_idx on game_sessions (host_id);

-- ── players ──────────────────────────────────────────────────────────────

create table players (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references game_sessions (id) on delete cascade,
  nickname     text not null,
  client_token uuid not null default gen_random_uuid(),
  score        int not null default 0,
  streak       int not null default 0,
  connected    boolean not null default true,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, client_token)
);

create index players_session_id_idx on players (session_id);

-- Case-insensitive nickname uniqueness within a session. This is an
-- expression, so it cannot be a table-level UNIQUE constraint (those only
-- accept column names) — it has to be its own unique index.
create unique index players_session_nickname_key
  on players (session_id, lower(nickname));

-- ── player_answers ───────────────────────────────────────────────────────

create table player_answers (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references game_sessions (id) on delete cascade,
  player_id           uuid not null references players (id) on delete cascade,
  question_id         uuid not null references questions (id),
  selected_option_id  uuid not null references answer_options (id),
  is_correct          boolean not null,
  response_ms         int not null,
  points_awarded       int not null,
  created_at           timestamptz not null default now(),
  -- The double-submission defence. Enforced in the database, not app code.
  unique (player_id, question_id)
);

create index player_answers_session_question_idx
  on player_answers (session_id, question_id);
