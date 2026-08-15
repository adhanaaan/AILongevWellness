-- AI Wellness — wearable + health-data ingestion (Terra aggregator + health-export app).
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Safe to re-run (create table/policy if-not-exists patterns).
--
-- Two API-driven ingestion paths land data as biomarkers:
--   1. Terra API (api/terra-*.ts) — OAuth aggregator for wearables (Oura, Garmin,
--      Fitbit, Whoop, ...). Terra posts to api/terra-webhook, tagged with the
--      reference_id we set = the participant id.
--   2. A health-export app (api/health-ingest.ts) — an unattended iOS automation
--      that POSTs Apple Health JSON to a per-participant URL carrying ingest_token.

-- Which providers a participant has connected via Terra. The biomarker data
-- itself lands in public.biomarkers; this table is for showing connection status
-- and mapping Terra's per-connection user_id back to a participant. Written only
-- by the Terra webhook (service role, bypasses RLS).
create table if not exists public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  terra_user_id text not null unique,
  provider text,
  connected_at timestamptz not null default now()
);

alter table public.wearable_connections enable row level security;

-- Mirrors the ownership pattern from 0001_init.sql: care team sees all,
-- participants read only their own connections.
create policy "care team full access to wearable_connections" on public.wearable_connections for all
  using (current_user_role() = 'care_team') with check (current_user_role() = 'care_team');
create policy "participant reads own wearable connections" on public.wearable_connections for select
  using (participant_id = current_user_participant_id());

-- Per-participant secret the health-export app embeds in its POST URL, so an
-- unattended device automation can authenticate to /api/health-ingest without a
-- login session. Minted on demand from the app; rotatable by regenerating.
alter table public.participants
  add column if not exists ingest_token text unique;
