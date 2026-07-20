-- AI Wellness — initial schema, RLS policies, and state-machine RPCs.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Mirrors lib/types/db.ts field-for-field.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null,
  sex text not null check (sex in ('male', 'female', 'other')),
  height_cm numeric not null,
  weight_kg numeric not null,
  goals text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.capture_channels (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  channel text not null check (channel in ('manual', 'wearables', 'body_composition', 'lab_report', 'recognize')),
  status text not null check (status in ('empty', 'partial', 'complete')) default 'empty',
  entered_by text check (entered_by in ('participant', 'admin')),
  updated_at timestamptz not null default now(),
  unique (participant_id, channel)
);

create table if not exists public.biomarkers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  pillar text not null check (pillar in ('vascular', 'metabolic', 'mental')),
  key text not null,
  label text not null,
  value numeric,
  unit text not null,
  ref_low numeric,
  ref_high numeric,
  source text not null check (source in ('manual', 'wearable', 'lab_extract', 'body_comp', 'recognize', 'admin')),
  status text not null check (status in ('entered', 'imported', 'extracted', 'needs_review')),
  flagged boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (participant_id, key)
);

create table if not exists public.ai_draft (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  scores jsonb not null,
  biological_age int not null,
  chronological_age int not null,
  key_contributors jsonb not null default '[]',
  strengths text[] not null default '{}',
  areas_to_monitor text[] not null default '{}',
  suggested_focus text[] not null default '{}',
  discussion_points text[] not null default '{}',
  generated_at timestamptz not null default now(),
  edited_by_admin boolean not null default false,
  missing_biomarkers text[] not null default '{}',
  out_of_range jsonb not null default '[]'
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  stage text not null check (stage in ('gp', 'tcm')),
  reviewer_name text not null,
  reviewer_credential text not null,
  notes text not null default '',
  signed_at timestamptz,
  unique (participant_id, stage)
);

create table if not exists public.pipeline (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  state text not null check (state in ('capturing', 'ai_drafted', 'gp_review', 'tcm_review', 'signed', 'delivered')) default 'capturing',
  needs_attention boolean not null default false,
  attention_reason text,
  delivered_at timestamptz
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  kind text not null check (kind in ('lab_report', 'body_comp', 'apple_health_export')),
  storage_path text not null,
  extracted boolean not null default false
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  log_date date not null,
  sleep jsonb,
  food jsonb,
  mood jsonb,
  activity jsonb,
  weight_kg numeric,
  supplements text[] not null default '{}',
  notes text,
  unique (participant_id, log_date)
);

-- Links a Supabase Auth user to an app role, and (for participants) to their
-- own participant record. Care team accounts have participant_id = null.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('participant', 'care_team')),
  participant_id uuid references public.participants(id) on delete set null
);

-- ─────────────────────────────────────────────────────────────
-- Helper functions (security definer so RLS on user_roles doesn't recurse)
-- ─────────────────────────────────────────────────────────────

create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.current_user_participant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select participant_id from public.user_roles where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.participants enable row level security;
alter table public.capture_channels enable row level security;
alter table public.biomarkers enable row level security;
alter table public.ai_draft enable row level security;
alter table public.reviews enable row level security;
alter table public.pipeline enable row level security;
alter table public.files enable row level security;
alter table public.daily_logs enable row level security;
alter table public.user_roles enable row level security;

-- user_roles: everyone can read their own row; nothing else is exposed.
create policy "read own role" on public.user_roles for select
  using (user_id = auth.uid());

-- participants: care team sees/edits everyone; participants see/edit only themselves.
create policy "care team full access to participants" on public.participants for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant reads own record" on public.participants for select
  using (id = current_user_participant_id());
create policy "participant updates own record" on public.participants for update
  using (id = current_user_participant_id()) with check (id = current_user_participant_id());

-- capture_channels: both sides can read/write the participant's own channels.
create policy "care team full access to capture_channels" on public.capture_channels for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant manages own capture_channels" on public.capture_channels for all
  using (participant_id = current_user_participant_id())
  with check (participant_id = current_user_participant_id());

-- biomarkers: care team can edit (admin review table); participants are read-only
-- (there's no UI path for a participant to edit their own biomarkers today).
create policy "care team full access to biomarkers" on public.biomarkers for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant reads own biomarkers" on public.biomarkers for select
  using (participant_id = current_user_participant_id());

-- ai_draft: same shape as biomarkers — care team edits, participant reads.
create policy "care team full access to ai_draft" on public.ai_draft for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant reads own ai_draft" on public.ai_draft for select
  using (participant_id = current_user_participant_id());

-- reviews: writes only happen through sign_off() below; both sides can read.
create policy "care team reads all reviews" on public.reviews for select
  using (current_user_role() = 'care_team');
create policy "participant reads own reviews" on public.reviews for select
  using (participant_id = current_user_participant_id());

-- pipeline: writes only happen through the RPCs below; both sides can read.
create policy "care team reads all pipelines" on public.pipeline for select
  using (current_user_role() = 'care_team');
create policy "participant reads own pipeline" on public.pipeline for select
  using (participant_id = current_user_participant_id());

-- files: participant uploads/reads their own; care team sees everything.
create policy "care team full access to files" on public.files for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant manages own files" on public.files for all
  using (participant_id = current_user_participant_id())
  with check (participant_id = current_user_participant_id());

-- daily_logs: participant-owned; care team read-only (not edited in the admin UI today).
create policy "care team reads all daily_logs" on public.daily_logs for select
  using (current_user_role() = 'care_team');
create policy "participant manages own daily_logs" on public.daily_logs for all
  using (participant_id = current_user_participant_id())
  with check (participant_id = current_user_participant_id());

-- ─────────────────────────────────────────────────────────────
-- State-machine RPCs — mirror the guard logic in lib/data/mock.ts exactly,
-- enforced server-side so the client can't bypass a transition by writing
-- to the table directly (there's no direct UPDATE grant on pipeline/reviews).
-- ─────────────────────────────────────────────────────────────

-- Participant (or care team, on their behalf) submits capture once every
-- channel is complete. Advances capturing -> ai_drafted. A separate AI route
-- (server-side, service role) generates the real draft and advances
-- ai_drafted -> gp_review once it's written.
create or replace function public.submit_capture(p_participant_id uuid)
returns public.pipeline
language plpgsql security definer set search_path = public as $$
declare
  v_state text;
  v_incomplete int;
  v_row public.pipeline;
begin
  if current_user_role() <> 'care_team' and current_user_participant_id() <> p_participant_id then
    raise exception 'Not authorized to submit capture for this participant.';
  end if;

  select state into v_state from public.pipeline where participant_id = p_participant_id for update;
  if v_state is null then
    raise exception 'Unknown participant %', p_participant_id;
  end if;
  if v_state <> 'capturing' then
    raise exception 'Capture has already been submitted for this participant.';
  end if;

  select count(*) into v_incomplete from public.capture_channels
    where participant_id = p_participant_id and status <> 'complete';
  if v_incomplete > 0 then
    raise exception 'All capture channels must be complete before submitting.';
  end if;

  update public.pipeline set state = 'ai_drafted' where participant_id = p_participant_id
    returning * into v_row;
  return v_row;
end;
$$;

-- Care team signs a stage. GP must be gp_review; TCM must be tcm_review
-- (i.e. GP already signed) — matches mock.ts's signOff exactly.
create or replace function public.sign_off(
  p_participant_id uuid,
  p_stage text,
  p_reviewer_name text,
  p_reviewer_credential text,
  p_notes text
)
returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_state text;
  v_next_state text;
  v_review public.reviews;
begin
  if current_user_role() <> 'care_team' then
    raise exception 'Only care team can sign off.';
  end if;
  if p_stage not in ('gp', 'tcm') then
    raise exception 'Unknown stage %', p_stage;
  end if;

  select state into v_state from public.pipeline where participant_id = p_participant_id for update;
  if p_stage = 'gp' and v_state <> 'gp_review' then
    raise exception 'GP sign-off is not available at this stage.';
  elsif p_stage = 'tcm' and v_state <> 'tcm_review' then
    raise exception 'TCM sign-off is locked until GP sign-off is complete.';
  end if;

  insert into public.reviews (participant_id, stage, reviewer_name, reviewer_credential, notes, signed_at)
  values (p_participant_id, p_stage, p_reviewer_name, p_reviewer_credential, coalesce(p_notes, ''), now())
  on conflict (participant_id, stage) do update
    set reviewer_name = excluded.reviewer_name,
        reviewer_credential = excluded.reviewer_credential,
        notes = excluded.notes,
        signed_at = excluded.signed_at
  returning * into v_review;

  v_next_state := case when p_stage = 'gp' then 'tcm_review' else 'signed' end;
  update public.pipeline set state = v_next_state where participant_id = p_participant_id;

  return v_review;
end;
$$;

-- Care team releases the card once both stages are signed.
create or replace function public.release_card(p_participant_id uuid)
returns public.pipeline
language plpgsql security definer set search_path = public as $$
declare
  v_state text;
  v_row public.pipeline;
begin
  if current_user_role() <> 'care_team' then
    raise exception 'Only care team can release the card.';
  end if;

  select state into v_state from public.pipeline where participant_id = p_participant_id for update;
  if v_state <> 'signed' then
    raise exception 'Release is locked until both GP and TCM sign-off are complete.';
  end if;

  update public.pipeline set state = 'delivered', delivered_at = now()
    where participant_id = p_participant_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.resolve_attention(p_participant_id uuid)
returns public.pipeline
language plpgsql security definer set search_path = public as $$
declare
  v_row public.pipeline;
begin
  if current_user_role() <> 'care_team' then
    raise exception 'Only care team can resolve attention flags.';
  end if;
  update public.pipeline set needs_attention = false, attention_reason = null
    where participant_id = p_participant_id
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.submit_capture(uuid) to authenticated;
grant execute on function public.sign_off(uuid, text, text, text, text) to authenticated;
grant execute on function public.release_card(uuid) to authenticated;
grant execute on function public.resolve_attention(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Storage buckets + policies
-- Object paths are expected as "{participant_id}/{filename}" so ownership
-- can be checked from the path alone.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', false), ('body-comp-scans', 'body-comp-scans', false), ('health-exports', 'health-exports', false)
on conflict (id) do nothing;

create policy "participant manages own files in storage" on storage.objects for all
  using (
    bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports')
    and (storage.foldername(name))[1] = current_user_participant_id()::text
  )
  with check (
    bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports')
    and (storage.foldername(name))[1] = current_user_participant_id()::text
  );

create policy "care team full access to storage" on storage.objects for all
  using (bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports') and current_user_role() = 'care_team')
  with check (bucket_id in ('lab-reports', 'body-comp-scans', 'health-exports') and current_user_role() = 'care_team');

-- ─────────────────────────────────────────────────────────────
-- Sign-up bootstrapping — runs as a trigger owner (bypasses RLS), so there's
-- no chicken-and-egg problem of a brand-new user needing a user_roles row
-- before they're allowed to create one. The client passes role (+ profile
-- fields for participants) as auth signUp() metadata; see
-- lib/auth/AuthProvider.tsx signUpParticipant/signUpCareTeam.
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'participant');
  v_participant_id uuid;
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
