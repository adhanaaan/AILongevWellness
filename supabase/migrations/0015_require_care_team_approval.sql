-- AI Wellness — SECURITY: make care-team signup an explicit APPROVAL gate.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Requires 0013_gate_care_team_role.sql to have been applied first (it creates
-- public.care_team_allowlist).
--
-- Background: 0013 already stopped self-asserted care_team access — a care_team
-- signup from a non-allowlisted email was SILENTLY downgraded to a participant.
-- That closed the security hole but left two rough edges:
--   1. Someone using the admin page to "create a care team account" silently
--      became a normal participant instead — confusing, and it created a junk
--      participant record + pipeline rows for what was really a failed admin
--      signup.
--   2. It read as "anyone can sign up", when the intent is "only pre-approved
--      clinicians can".
--
-- This migration makes the gate explicit: care_team is granted ONLY to an
-- allowlisted email; a care_team request from a NON-allowlisted email is now
-- REJECTED (the signup fails, no auth user and no participant row are created),
-- instead of being quietly turned into a participant. Normal participant signups
-- (role 'participant' or unset) are unchanged.
--
-- APPROVAL PROCESS (ops): a person only becomes care_team if an administrator
-- adds their email to the allowlist BEFORE they sign up, e.g.
--   insert into public.care_team_allowlist (email) values ('dr.smith@example.com');
-- Then they create their login on the admin page. No allowlist row -> no admin.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_requested text := coalesce(new.raw_user_meta_data->>'role', 'participant');
  v_participant_id uuid;
begin
  if v_requested = 'care_team' then
    -- Honor a care_team request ONLY for a pre-approved (allowlisted) email.
    -- Otherwise reject the signup outright rather than silently downgrading it,
    -- so no junk participant account is created from a failed admin signup.
    if not exists (
      select 1 from public.care_team_allowlist a
      where lower(a.email) = lower(new.email)
    ) then
      raise exception 'Care-team access requires prior approval. Ask an administrator to add your email before signing up.'
        using errcode = 'check_violation';
    end if;

    insert into public.user_roles (user_id, role, participant_id)
    values (new.id, 'care_team', null);
    return new;
  end if;

  -- Normal participant provisioning (unchanged from 0013).
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
