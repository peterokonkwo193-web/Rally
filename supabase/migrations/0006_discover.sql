-- Supports the public landing page + Discover library. Quizzes/questions
-- themselves stay exactly as locked down as before (rule 5) — this only
-- exposes non-sensitive quiz metadata for quizzes their owner has opted
-- to share, mirroring the categories public-read policy from 0004.

alter table quizzes
  add column question_count int not null default 0;

-- Non-sensitive metadata (title/description/category/count) for quizzes
-- the owner explicitly marked public. Never exposes question content —
-- questions/answer_options have no policy here or anywhere else.
create policy "public quizzes are readable"
  on quizzes for select
  using (is_public = true);
