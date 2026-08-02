-- =====================================================================
-- FX TEACHING ENGINE
-- Admin authors a lesson: timed steps that (a) move the demo price and
-- (b) send an instruction to the Telegram group — at the scheduled time.
-- Self-contained; drives demo_fx_pairs directly (what the FX page reads).
-- =====================================================================
create table if not exists public.fx_lessons (
  id uuid primary key default uuid_generate_v4(),
  pair_id uuid,
  pair_symbol text,
  title text,
  status text default 'running',   -- running | completed | stopped
  started_at timestamptz default now(),
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.fx_lesson_steps (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid references public.fx_lessons(id) on delete cascade,
  step_order int default 0,
  offset_seconds int not null default 0,  -- seconds after the lesson starts
  target_bid numeric(20,8),               -- optional explicit target price
  target_ask numeric(20,8),
  direction text,                         -- optional: 'up' | 'down'
  pips numeric(12,2),                     -- optional: move N pips in direction
  instruction text,                       -- human note / log
  telegram_message text,                  -- sent to the group at this step
  executed boolean default false,
  executed_at timestamptz
);
create index if not exists idx_fx_lesson_steps_lesson on public.fx_lesson_steps(lesson_id);

alter table public.fx_lessons enable row level security;
alter table public.fx_lesson_steps enable row level security;
drop policy if exists fx_lessons_read on public.fx_lessons;
create policy fx_lessons_read on public.fx_lessons for select using (true);
drop policy if exists fx_lesson_steps_read on public.fx_lesson_steps;
create policy fx_lesson_steps_read on public.fx_lesson_steps for select using (true);
