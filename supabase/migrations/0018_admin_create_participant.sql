-- Let a care-team member create a participant record from the admin portal (for a
-- clinician-managed patient who never self-signs-up — e.g. a demo, or reports
-- collected at the retreat). participants.id is an independent UUID (not tied to
-- an auth user), so such a record simply has no login; the care team manages it.
--
-- pipeline is RLS-locked to SELECT for care_team (writes go only through
-- SECURITY DEFINER RPCs), so creation must happen in an RPC — mirrors
-- submit_capture / sign_off / release_card. Creates the participant, its pipeline
-- (capturing) and its capture_channels, exactly like handle_new_user does for a
-- self-signup.

create or replace function public.create_participant(
  p_name text,
  p_age int,
  p_sex text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_goals text[] default '{}'
)
returns public.participants
language plpgsql security definer set search_path = public as $$
declare
  v_participant public.participants;
begin
  if current_user_role() <> 'care_team' then
    raise exception 'Only care-team accounts can create a participant.';
  end if;

  insert into public.participants (name, age, sex, height_cm, weight_kg, goals)
  values (p_name, p_age, p_sex, p_height_cm, p_weight_kg, coalesce(p_goals, '{}'))
  returning * into v_participant;

  insert into public.pipeline (participant_id, state) values (v_participant.id, 'capturing');

  insert into public.capture_channels (participant_id, channel, status)
  select v_participant.id, c, 'empty'
  from unnest(array['manual', 'wearables', 'body_composition', 'lab_report', 'recognize']) as c;

  return v_participant;
end;
$$;
