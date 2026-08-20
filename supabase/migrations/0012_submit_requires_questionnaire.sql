-- AI Wellness — submission requires only the questionnaire.
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
--
-- The revamped onboarding is quiz-first: signup -> quiz (questionnaire) -> card.
-- ReCOGnAIze and every upload are optional enrichment ("insights from basic
-- info, more on more data"). But submit_capture (0010) still required BOTH
-- `manual` and `recognize`, and the only in-app caller of submit was at the end
-- of the optional ReCOGnAIze flow — so a participant who finished the quiz (and
-- even uploaded labs) but skipped ReCOGnAIze could never leave `capturing`,
-- never reached the review queue, and never received a reviewed card.
--
-- Requiring only `manual` (the questionnaire, which the quiz always completes)
-- lets the participant submit for review as soon as onboarding is done; adding
-- ReCOGnAIze/labs afterward re-runs the draft (pre-sign-off) to sharpen it.
-- Kept in sync with MockRepository.submitCapture per CLAUDE.md rule #3.

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

  -- Only the questionnaire gates submission now.
  select count(*) into v_incomplete from public.capture_channels
    where participant_id = p_participant_id
      and channel = 'manual'
      and status <> 'complete';
  if v_incomplete > 0 then
    raise exception 'Please finish the questionnaire before submitting.';
  end if;

  update public.pipeline set state = 'ai_drafted' where participant_id = p_participant_id
    returning * into v_row;
  return v_row;
end;
$$;
