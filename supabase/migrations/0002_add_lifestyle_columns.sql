-- Adds the lifestyle fields to participants that lib/types/db.ts and
-- lib/data/mock.ts already have (added 2026-07-24) but this table never
-- picked up. Run in Supabase Dashboard -> SQL Editor -> New Query -> paste ->
-- Run, same as 0001_init.sql. Safe to re-run (uses `add column if not exists`).

alter table public.participants
  add column if not exists exercise_frequency text
    check (exercise_frequency in ('rarely', 'sometimes', 'regularly')),
  add column if not exists smoking boolean,
  add column if not exists alcohol_drinks_per_week text
    check (alcohol_drinks_per_week in ('none', '1_to_7', '8_to_14', '15_to_21', '21_plus'));
