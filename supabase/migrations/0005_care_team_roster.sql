-- AI Wellness — let care team accounts see how many teammates are registered.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- user_roles previously only allowed reading your own row ("read own role" in
-- 0001_init.sql), which the admin Settings page's real Team section needs to
-- read past to show a real registered-reviewer count. Additive: multiple
-- permissive policies OR together, so a participant's own-row read is unaffected.

create policy "care team reads all roles" on public.user_roles for select
  using (current_user_role() = 'care_team');
