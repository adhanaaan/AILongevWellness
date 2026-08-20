-- AI Wellness — make uploads optional at submit time, and accept raw Apple
-- Health export.xml uploads.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- Two launch-critical fixes:
--
-- 1) submit_capture previously required ALL five capture channels to be
--    'complete'. The onboarding flow (lib/onboarding/flow.ts) has since made
--    Wearables / Body Composition / Lab Reports OPTIONAL — only the
--    Questionnaire (manual) and ReCOGnAIze (recognize) are required. Without
--    this change, any participant who skips an upload can never leave the
--    'capturing' state, so they never reach the review queue and can never be
--    signed off / delivered. This realigns the RPC with the UI's required set.
--    (Kept in sync with MockRepository.submitCapture per CLAUDE.md rule #3.)

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

  -- Only the required channels gate submission; uploads are optional.
  select count(*) into v_incomplete from public.capture_channels
    where participant_id = p_participant_id
      and channel in ('manual', 'recognize')
      and status <> 'complete';
  if v_incomplete > 0 then
    raise exception 'Please finish the questionnaire and ReCOGnAIze before submitting.';
  end if;

  update public.pipeline set state = 'ai_drafted' where participant_id = p_participant_id
    returning * into v_row;
  return v_row;
end;
$$;

-- 2) The onboarding Wearables channel accepts a raw Apple Health `export.xml`
--    (not just the `.zip`), and api/extract-wearables.ts parses either. But the
--    health-exports bucket's MIME allowlist (0003) only permitted zip types, so
--    an XML upload was rejected at the storage layer before extraction. Add the
--    XML content types.

update storage.buckets set
  allowed_mime_types = array[
    'application/zip', 'application/x-zip-compressed',
    'application/xml', 'text/xml'
  ]
where id = 'health-exports';
