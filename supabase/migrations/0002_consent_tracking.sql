-- AI Wellness — add consent tracking to participants.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- No RLS/policy changes needed: "participant updates own record" (0001_init.sql)
-- already grants participants UPDATE on their own row with no column restriction.

alter table public.participants
  add column if not exists consent_given boolean not null default false,
  add column if not exists consented_at timestamptz;
