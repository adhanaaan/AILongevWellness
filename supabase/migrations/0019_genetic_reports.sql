-- AI Wellness — genetic report storage (store-and-view-only).
-- Run once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- A genetic / DNA screening report is uploaded by the care team for their own
-- review. It is deliberately NOT auto-extracted or scored: it isn't a lab panel,
-- and interpreting one is a clinical act, not wellness. So this only needs a
-- private storage bucket wired into the same RLS as the other report buckets;
-- the public.files table policies already cover a genetic file row (they are
-- table-wide, not per-bucket), so no change is needed there.

-- 1. The private bucket, with a 20 MB cap and the same document/image MIME set
--    as lab-reports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'genetic-reports',
  'genetic-reports',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Re-create the two storage.objects policies from 0001_init.sql with
--    'genetic-reports' added to the bucket list. (A policy's USING/WITH CHECK
--    can't be altered in place, so drop + recreate.)
drop policy if exists "participant manages own files in storage" on storage.objects;
create policy "participant manages own files in storage" on storage.objects for all
  using (
    bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports', 'genetic-reports')
    and (storage.foldername(name))[1] = current_user_participant_id()::text
  )
  with check (
    bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports', 'genetic-reports')
    and (storage.foldername(name))[1] = current_user_participant_id()::text
  );

drop policy if exists "care team full access to storage" on storage.objects;
create policy "care team full access to storage" on storage.objects for all
  using (bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports', 'genetic-reports') and current_user_role() = 'care_team')
  with check (bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports', 'genetic-reports') and current_user_role() = 'care_team');
