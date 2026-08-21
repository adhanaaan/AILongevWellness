-- AI Wellness — SECURITY/COMPLIANCE: make consent columns non-forgeable.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- The "participant updates own record" RLS policy grants UPDATE on the whole row,
-- so a participant could forge consent_given/consented_at (claim consent they
-- never gave) or clear their own consent_withdrawn_at — undermining the consent
-- audit trail for a health product.
--
-- Fix: consent state changes go through SECURITY DEFINER RPCs, and a trigger
-- rejects any direct write to the consent columns unless a transaction-local
-- flag is set — and only these RPCs set it (a client can't set it via a normal
-- PostgREST update). Participants can still read their own consent state; they
-- just can't write these columns directly. Care-team access is unchanged.

-- Idempotent: record consent once for the calling participant.
create or replace function public.record_consent()
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted_consent', 'on', true);
  update public.participants
    set consent_given = true, consented_at = now()
    where id = current_user_participant_id()
      and consent_given is not true;
end;
$$;

-- Withdraw consent for the calling participant (non-destructive; surfaced to the
-- care team, data is not auto-deleted).
create or replace function public.withdraw_consent()
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted_consent', 'on', true);
  update public.participants
    set consent_withdrawn_at = now()
    where id = current_user_participant_id();
end;
$$;

grant execute on function public.record_consent() to authenticated;
grant execute on function public.withdraw_consent() to authenticated;

-- Block any direct UPDATE from changing the consent columns unless a trusted RPC
-- above set the transaction-local flag. Silently preserves the old values so a
-- normal profile update (name/age/etc.) is unaffected.
create or replace function public.protect_consent_columns()
returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.trusted_consent', true), '') <> 'on' then
    new.consent_given := old.consent_given;
    new.consented_at := old.consented_at;
    new.consent_withdrawn_at := old.consent_withdrawn_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_consent_columns on public.participants;
create trigger protect_consent_columns
  before update on public.participants
  for each row execute function public.protect_consent_columns();
