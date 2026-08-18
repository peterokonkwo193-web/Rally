-- Supports three question types (multiple_choice/true_false/type_answer)
-- and host moderation controls (kick-player, force-skip on lock-question —
-- the latter needs no schema change, just an edge function param).

alter table questions
  add column question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'type_answer'));

-- type_answer stores *accepted answers* in answer_options (all is_correct
-- = true, no fixed wrong-answer list) — a wrong free-text submission has
-- no matching option row to point at, so this has to go nullable. The raw
-- typed text is preserved in the new answer_text column instead (for
-- type_answer submissions only; null for multiple_choice/true_false).
alter table player_answers
  alter column selected_option_id drop not null,
  add column answer_text text;
