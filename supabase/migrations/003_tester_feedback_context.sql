begin;
alter table public.tester_feedback
  add column if not exists current_wave integer,
  add column if not exists operating_system text,
  add column if not exists progress_context jsonb not null default '{}'::jsonb,
  add column if not exists unlock_context jsonb not null default '{}'::jsonb,
  add column if not exists screenshot_data text;
-- Existing insert-only RLS remains authoritative. No player read/update/delete policy is introduced.
commit;
