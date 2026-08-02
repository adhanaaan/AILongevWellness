-- AI Wellness — Care Plan tab: doctor-verified per-category plan + medications catalog.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- No RLS/policy changes needed: "participant updates own record" (0001_init.sql)
-- already grants participants UPDATE on their own participants row with no column
-- restriction, and ai_draft keeps its existing care-team-write/participant-read
-- split -- care_plan is AI-drafted then doctor-verified during review, same as
-- suggested_focus/discussion_points already are.

alter table public.participants
  add column if not exists medications text[] not null default '{}';

alter table public.ai_draft
  add column if not exists care_plan jsonb;
