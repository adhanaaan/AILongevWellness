-- AI Wellness — SECURITY: stop care_team role from being self-asserted at signup.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- Before this, handle_new_user() trusted raw_user_meta_data->>'role' verbatim, so
-- ANYONE could call auth.signUp with {role:'care_team'} against the public anon
-- key and be granted care_team — which under RLS has full read/write to EVERY
-- participant's health data. That is a cross-tenant PHI breach vector.
--
-- Fix: care_team is granted ONLY when the signup email is on a server-side
-- allowlist that clients cannot read or write. Everyone else (including a
-- care_team request from a non-allowlisted email) is provisioned as a normal
-- participant. There is no enumeration/probe: a disallowed care_team request
-- silently becomes a participant.
--
-- OPS: before a clinician signs up, add their email here, e.g.
--   insert into public.care_team_allowlist (email) values ('dr.smith@example.com');
-- (Existing care_team accounts created before this migration are unaffected — the
--  trigger only runs on new signups. Review public.user_roles for any care_team
--  rows you did not intend and delete them.)

create table if not exists public.care_team_allowlist (
  email text primary key,
  added_at timestamptz not null default now()
);

-- Lock it down: RLS on, and NO policies for anon/authenticated -> clients can
-- neither read nor write it. The SECURITY DEFINER trigger below bypasses RLS.
alter table public.care_team_allowlist enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_requested text := coalesce(new.raw_user_meta_data->>'role', 'participant');
  v_role text;
  v_participant_id uuid;
begin
  -- Never derive a privileged role from client metadata. Honor a care_team
  -- request only if the email is allowlisted; otherwise fall back to participant.
  if v_requested = 'care_team'
     and exists (
       select 1 from public.care_team_allowlist a
       where lower(a.email) = lower(new.email)
     )
  then
    v_role := 'care_team';
  else
    v_role := 'participant';
  end if;

  if v_role = 'care_team' then
    insert into public.user_roles (user_id, role, participant_id)
    values (new.id, 'care_team', null);
  else
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
  end if;
  return new;
end;
$$;

-- Trigger definition itself is unchanged (still on_auth_user_created -> handle_new_user).
