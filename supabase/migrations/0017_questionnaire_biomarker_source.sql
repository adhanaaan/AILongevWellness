-- Allow biomarkers written from the mental-wellbeing questionnaires (WHO-5 +
-- PSS-4) to record source = 'questionnaire'. The original biomarkers.source
-- CHECK (0001_init.sql, last widened in 0009_wearable_ingest.sql for
-- 'apple_health') doesn't allow it, so /api/submit-questionnaire would otherwise
-- fail the insert with a constraint violation.

alter table public.biomarkers drop constraint if exists biomarkers_source_check;
alter table public.biomarkers add constraint biomarkers_source_check
  check (source in ('manual', 'wearable', 'lab_extract', 'body_comp', 'recognize', 'admin', 'apple_health', 'questionnaire'));
