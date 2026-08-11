-- ─────────────────────────────────────────────────────────────
-- Preserve every biomarker reading ever extracted, not just the latest one.
-- Until now, extract-lab.ts / extract-body-comp.ts upserted straight into
-- biomarkers keyed on (participant_id, key) -- re-uploading a lab report
-- from a different date silently overwrote the previous value with no trace
-- it ever existed, and there was no way to show a trend even if we wanted to.
--
-- biomarker_readings is purely additive history, keyed by measured_at (the
-- real specimen/report date, extracted from the document itself where
-- possible -- not the upload timestamp). biomarkers stays exactly what it
-- was: the "current" snapshot that scoring/generate-draft reads. The write
-- path (lib/data/biomarkerReadings.ts) only promotes a new reading into that
-- current snapshot if its measured_at is the same age or newer than what's
-- already there, so uploading an old backfilled report after a recent one
-- can no longer regress the score-driving value.
-- ─────────────────────────────────────────────────────────────

alter table public.biomarkers add column if not exists measured_at date;

create table if not exists public.biomarker_readings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  key text not null,
  value numeric not null,
  unit text not null,
  ref_low numeric,
  ref_high numeric,
  source text not null,
  measured_at date not null,
  file_id uuid references public.files(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (participant_id, key, file_id)
);

create index if not exists biomarker_readings_participant_key_idx
  on public.biomarker_readings (participant_id, key, measured_at);

alter table public.biomarker_readings enable row level security;

-- Same access shape as biomarkers: care team read/write, participant read-only own.
create policy "care team full access to biomarker_readings" on public.biomarker_readings for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant reads own biomarker_readings" on public.biomarker_readings for select
  using (participant_id = current_user_participant_id());
