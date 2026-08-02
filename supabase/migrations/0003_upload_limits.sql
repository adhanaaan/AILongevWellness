-- AI Wellness — add file size/type limits to storage buckets.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Previously the buckets had no size or MIME-type limit at all (only whatever
-- the document picker's own type filter happened to restrict client-side),
-- so a participant could upload an arbitrarily large or arbitrary-type file.

update storage.buckets set
  file_size_limit = 20971520, -- 20 MB -- generous for a multi-page scanned PDF or photo
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id in ('lab-reports', 'body-comp-scans');

update storage.buckets set
  file_size_limit = 209715200, -- 200 MB -- a multi-year Apple Health export.zip can get large
  allowed_mime_types = array['application/zip', 'application/x-zip-compressed']
where id = 'health-exports';
