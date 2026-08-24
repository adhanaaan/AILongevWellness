-- AI Wellness — care-team accounts are ADMIN-CREATED, not self-service.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Requires 0013_gate_care_team_role.sql (creates public.care_team_allowlist).
-- Supersedes the handle_new_user() definitions in 0013 and 0015.
--
-- Model: there is no public admin sign-up (the admin login is sign-in only).
-- YOU create each care-team account yourself in Supabase. Because the trigger
-- below fires on every new auth user, it decides the role SOLELY from the
-- allowlist — the requested role in client metadata is ignored entirely, so the
-- role can never be escalated from the client:
--   * email IS on care_team_allowlist  -> care_team (no participant row created)
--   * email NOT on the allowlist        -> normal participant
--
-- CREATING AN ADMIN (two steps, both in the Supabase Dashboard):
--   1) SQL Editor:
--        insert into public.care_team_allowlist (email) values ('dr.smith@clinic.example');
--   2) Authentication -> Users -> "Add user" (set email + password, or send an
--      invite). On creation this trigger sees the allowlisted email and grants
--      care_team. Hand the credentials to the clinician; they sign in at
--      /admin/login. (Add the allowlist row BEFORE creating the user. If you
--      created the user first, they'll be a participant — delete that user and
--      the participant row, add the allowlist entry, then recreate the user.)
--
-- REVOKING: delete their public.user_roles row (and the auth user), and remove
-- the care_team_allowlist entry.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_participant_id uuid;
begin
  -- Role is decided by the server-side allowlist ONLY. Client metadata (role)
  -- is never trusted, so a participant sign-up can never become care_team.
  if exists (
    select 1 from public.care_team_allowlist a
    where lower(a.email) = lower(new.email)
  ) then
    insert into public.user_roles (user_id, role, participant_id)
    values (new.id, 'care_team', null);
    return new;
  end if;

  -- Everyone else is a normal participant.
  insert into public.participants (name, age, sex, height_cm, weight_kg, goals)
  values (
    coalesce(new.raw_user_meta_data->>'name', 'New participant'),
    coalesce((new.raw_user_meta_data->>'age')::int, 40),
    coalesce(new.raw_user_meta_data->>'sex', 'other'),
    coalesce((new.raw_user_meta_data->>'height_cm')::numeric, 170),
    coalesce((new.raw_user_meta_data->>'weight_kg')::numeric, 70),
    '{}'
  )
  returning id into v_participant_id;

  insert into public.pipeline (participant_id, state) values (v_participant_id, 'capturing');

  insert into public.capture_channels (participant_id, channel, status)
  select v_participant_id, c, 'empty'
  from unnest(array['manual', 'wearables', 'body_composition', 'lab_report', 'recognize']) as c;

  insert into public.user_roles (user_id, role, participant_id)
  values (new.id, 'participant', v_participant_id);

  return new;
end;
$$;
