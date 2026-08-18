-- Row Level Security, locked to default-deny on every table (CLAUDE.md
-- rule 5: "RLS is enabled on every table. No exceptions.").
--
-- No policies are created for `anon` or `authenticated` here. All reads and
-- writes in M1 go through edge functions authenticated with the service
-- role key, which bypasses RLS entirely — that is the only privileged path
-- into these tables. M5 (quiz editor) will add narrow owner-scoped SELECT/
-- INSERT/UPDATE policies on `quizzes`/`questions`/`answer_options` when
-- authenticated hosts actually need to manage their own quizzes directly;
-- adding them now would be unused surface area.

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table game_sessions enable row level security;
alter table players enable row level security;
alter table player_answers enable row level security;
