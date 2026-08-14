-- AI Wellness — record participant-initiated consent withdrawal.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- No RLS/policy changes needed: "participant updates own record" (0001_init.sql)
-- already grants participants UPDATE on their own row with no column restriction,
-- so a participant can set this on themselves from Settings.
--
-- Withdrawal is deliberately NON-destructive here: it timestamps the withdrawal
-- and signs the participant out so processing stops from their side, and it
-- surfaces to the care team on the admin participant detail page. Actual data
-- deletion (right-to-erasure) is a care-team/admin action, not an automatic
-- consequence of withdrawal, so it can be handled per the retreat's data policy.

alter table public.participants
  add column if not exists consent_withdrawn_at timestamptz;
