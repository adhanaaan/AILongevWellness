-- AI Wellness — participant-initiated account deletion.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- Background: migration 0008 made consent withdrawal deliberately NON-destructive
-- ("actual data deletion is a care-team/admin action, not an automatic consequence
-- of withdrawal"). That remains true of withdrawal — but App Store guideline
-- 5.1.1(v) requires an app that supports account creation to let the user delete
-- the account from inside the app, so a self-service path has to exist too.
--
-- Design: erase personal data, retain the clinician sign-off trail. `reviews`
-- records which GP/TCM signed off on a delivered wellness card and when. Letting
-- it cascade would destroy that audit trail on a participant's request, so the
-- participants row is TOMBSTONED (identity scrubbed, row kept) rather than
-- deleted, and everything that is genuinely personal is removed outright.
-- Apple's requirement is that the ACCOUNT is gone and the login stops working,
-- which the auth.users delete below satisfies.
--
-- Two things drive the shape of this function:
--
-- 1. user_roles.participant_id is `on delete set null`, while user_roles.user_id
--    is `on delete cascade` from auth.users. So deleting only the participants
--    row leaves a ZOMBIE ACCOUNT: the user still signs in, gets
--    participant_id = null, is bounced to /onboarding/auth by ParticipantGuard,
--    and can never re-onboard because handle_new_user() is an
--    `after insert on auth.users` trigger that will never fire again for them.
--    Deleting the auth.users row is what actually removes the account, and it
--    cascades user_roles away for free.
--
-- 2. This is an RPC rather than a service-role API endpoint because
--    packages/web/api/ holds exactly 12 functions, which is the Vercel Hobby cap
--    — a 13th file fails the deploy (see the note in api/submit-mental.ts). A
--    SECURITY DEFINER RPC needs none, and is atomic besides.
--
-- NOTE: uploaded FILES are not touched here. storage.objects has no foreign key
-- to participants, so nothing below would reach them. The client purges storage
-- BEFORE calling this, while its own session still satisfies the storage policy's
-- `(storage.foldername(name))[1] = current_user_participant_id()::text`
-- predicate — see SupabaseRepository.deleteAccount.

alter table public.participants
  add column if not exists deleted_at timestamptz;

comment on column public.participants.deleted_at is
  'Set when the participant deleted their own account. The row is a tombstone kept only so reviews (clinician sign-offs) survive: name/age/sex/height_cm/weight_kg hold placeholder values because they are NOT NULL, so consumers must branch on deleted_at, never on those.';

create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_participant_id uuid := current_user_participant_id();
  v_user_id uuid := auth.uid();
begin
  if v_participant_id is null then
    raise exception 'No participant account for the current user.';
  end if;

  -- Personal data. Every one of these would also cascade from the participants
  -- row, but we are keeping that row, so they are removed explicitly.
  delete from public.biomarker_readings   where participant_id = v_participant_id;
  delete from public.biomarkers           where participant_id = v_participant_id;
  delete from public.daily_logs           where participant_id = v_participant_id;
  delete from public.ai_draft             where participant_id = v_participant_id;
  delete from public.files                where participant_id = v_participant_id;
  delete from public.capture_channels     where participant_id = v_participant_id;
  delete from public.wearable_connections where participant_id = v_participant_id;

  -- Scrub identity. name/age/sex/height_cm/weight_kg are NOT NULL in 0001_init
  -- and sex carries a CHECK constraint, so these are placeholders rather than
  -- nulls — deleted_at is the real signal.
  --
  -- set_config is required: the protect_consent_columns trigger from 0014
  -- silently reverts any write to the consent columns without it.
  perform set_config('app.trusted_consent', 'on', true);

  update public.participants set
    name                 = 'Deleted participant',
    age                  = 0,
    sex                  = 'other',
    height_cm            = 0,
    weight_kg            = 0,
    goals                = '{}',
    medications          = '{}',
    -- Per-participant secret in the health-export POST URL (api/health-ingest).
    -- Clearing it stops any device automation the participant had configured.
    ingest_token         = null,
    consent_given        = false,
    consent_withdrawn_at = coalesce(consent_withdrawn_at, now()),
    deleted_at           = now()
  where id = v_participant_id;

  -- Last, so a failure above leaves the account intact and retryable rather than
  -- login-less with data still present. Cascades user_roles; the caller's JWT
  -- now refers to a user that no longer exists, so the client must sign out
  -- immediately after this returns.
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_account() to authenticated;
