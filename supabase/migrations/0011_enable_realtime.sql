-- AI Wellness — enable Realtime replication on the app tables.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- SupabaseRepository subscribes to postgres_changes on the public schema to
-- refresh open screens when data changes. A new Supabase project's
-- `supabase_realtime` publication contains NO tables by default, so without this
-- CROSS-CLIENT updates never propagate:
--   - a clinician with a participant open doesn't see that participant's own
--     upload / extracted biomarkers / daily log (written from the participant's
--     device) until a manual reload;
--   - GP signs off in one browser, TCM in another doesn't see it flip to signed
--     (so Release looks stuck);
--   - after release, the participant's Insights/Care Plan don't swap to the
--     delivered card until reload.
-- Same-client writes are unaffected (the repository calls notify() directly).
--
-- RLS still applies to Realtime, so each subscriber only receives change events
-- for rows it is allowed to read (care team: all; participant: own) — enabling
-- replication here does not widen data access.
--
-- Idempotent: skips any table already in the publication.

do $$
declare
  t text;
begin
  foreach t in array array[
    'participants', 'pipeline', 'reviews', 'biomarkers', 'ai_draft',
    'files', 'daily_logs', 'capture_channels', 'biomarker_readings',
    'onboarding_progress', 'wearable_connections'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
