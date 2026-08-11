-- ─────────────────────────────────────────────────────────────
-- Make GP and TCM sign-off asynchronous: either can sign first, neither
-- blocks the other. Previously sign_off() required GP to complete before
-- TCM was even allowed to act (state had to be exactly 'tcm_review'),
-- forcing a strict order that doesn't match how a real GP/TCM pair
-- actually works a review queue in parallel.
--
-- 'gp_review' is repurposed to mean "awaiting one or both signatures"
-- rather than "GP's turn only" -- both stages can now be signed any time
-- the pipeline is in this state, and it only advances to 'signed' once
-- both stage rows exist. 'tcm_review' is no longer entered by this
-- function; the enum/check-constraint value is left in place (nothing
-- else in the schema depends on removing it) rather than touched here.
-- ─────────────────────────────────────────────────────────────

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
  v_gp_done boolean;
  v_tcm_done boolean;
begin
  if current_user_role() <> 'care_team' then
    raise exception 'Only care team can sign off.';
  end if;
  if p_stage not in ('gp', 'tcm') then
    raise exception 'Unknown stage %', p_stage;
  end if;

  select state into v_state from public.pipeline where participant_id = p_participant_id for update;
  if v_state <> 'gp_review' then
    raise exception 'Sign-off is not available at this stage.';
  end if;

  insert into public.reviews (participant_id, stage, reviewer_name, reviewer_credential, notes, signed_at)
  values (p_participant_id, p_stage, p_reviewer_name, p_reviewer_credential, coalesce(p_notes, ''), now())
  on conflict (participant_id, stage) do update
    set reviewer_name = excluded.reviewer_name,
        reviewer_credential = excluded.reviewer_credential,
        notes = excluded.notes,
        signed_at = excluded.signed_at
  returning * into v_review;

  select exists(
    select 1 from public.reviews
    where participant_id = p_participant_id and stage = 'gp' and signed_at is not null
  ) into v_gp_done;
  select exists(
    select 1 from public.reviews
    where participant_id = p_participant_id and stage = 'tcm' and signed_at is not null
  ) into v_tcm_done;

  v_next_state := case when v_gp_done and v_tcm_done then 'signed' else 'gp_review' end;
  update public.pipeline set state = v_next_state where participant_id = p_participant_id;

  return v_review;
end;
$$;

grant execute on function public.sign_off(uuid, text, text, text, text) to authenticated;
