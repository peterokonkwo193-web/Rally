-- Dev/staging fixture data — NOT part of the migration chain, run
-- separately (`supabase db seed` / applied automatically by `supabase
-- start`). Gives `create-session` a real quiz to reference before the M5
-- editor exists, and doubles as the "one hardcoded question" fixture M2
-- needs.
--
-- Seeding a quiz requires an owner in auth.users. This inserts one
-- fixed, non-login seed account purely as an FK anchor — it is never used
-- to authenticate. Safe to re-run: everything below is idempotent.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'seed-quiz-owner@example.invalid', '',
  now(), now(), now(),
  '{"provider":"seed","providers":["seed"]}', '{}',
  false, false
)
on conflict (id) do nothing;

insert into quizzes (id, owner_id, title, description, is_public)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo Quiz',
  'Seed fixture used while the quiz editor (M5) does not exist yet.',
  true
)
on conflict (id) do nothing;

insert into questions (id, quiz_id, position, text, time_limit_sec, points_factor)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  0,
  'Which planet is known as the Red Planet?',
  20,
  1.0
)
on conflict (id) do nothing;

insert into answer_options (question_id, position, text, is_correct)
values
  ('00000000-0000-0000-0000-000000000003', 0, 'Venus', false),
  ('00000000-0000-0000-0000-000000000003', 1, 'Mars', true),
  ('00000000-0000-0000-0000-000000000003', 2, 'Jupiter', false),
  ('00000000-0000-0000-0000-000000000003', 3, 'Saturn', false)
on conflict (question_id, position) do nothing;
