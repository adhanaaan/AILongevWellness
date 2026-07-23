import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config/env";
import type { Repository, SignedCard, UploadableFile } from "./repository";
import { BUCKET_BY_KIND } from "./storageBuckets";
import type {
  AiDraft,
  Biomarker,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileKind,
  FileRecord,
  Participant,
  ParticipantSummary,
  Pipeline,
  Review,
  ReviewStage,
} from "../types/db";

const CHANNELS: CaptureChannelName[] = ["manual", "wearables", "body_composition", "lab_report", "recognize"];

function must<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error(`${label} not found`);
  return data;
}

function defaultPipeline(participantId: string): Pipeline {
  return { participant_id: participantId, state: "capturing", needs_attention: false, attention_reason: null, delivered_at: null };
}

let _client: SupabaseClient | null = null;

/**
 * The single shared Supabase client — used by both SupabaseRepository and
 * AuthProvider (lib/auth/AuthProvider.tsx), so auth session state and RLS's
 * auth.uid() always line up with whichever client issued a query. Returns
 * null when EXPO_PUBLIC_SUPABASE_URL/ANON_KEY aren't set (mock mode).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Web uses the browser's own storage automatically; native needs an explicit adapter.
        storage: Platform.OS === "web" ? undefined : (AsyncStorage as any),
      },
    });
  }
  return _client;
}

export class SupabaseRepository implements Repository {
  private client: SupabaseClient;
  private listeners: Array<() => void> = [];

  constructor(client: SupabaseClient) {
    this.client = client;

    // Coarse-grained realtime: any change to app tables notifies every subscriber,
    // same granularity as MockRepository's global notify() — good enough for a
    // 20-person pilot, and keeps subscribe() call sites unchanged.
    this.client
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => this.notify())
      .subscribe();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async listParticipants(): Promise<ParticipantSummary[]> {
    const [{ data: participants, error: pErr }, { data: pipelines }, { data: channels }] = await Promise.all([
      this.client.from("participants").select("*").order("name"),
      this.client.from("pipeline").select("*"),
      this.client.from("capture_channels").select("*"),
    ]);
    if (pErr) throw new Error(pErr.message);

    return (participants ?? []).map((p: Participant) => {
      const pipeline = (pipelines ?? []).find((pl: Pipeline) => pl.participant_id === p.id) ?? defaultPipeline(p.id);
      const own = (channels ?? []).filter((c: CaptureChannel) => c.participant_id === p.id);
      const completion =
        CHANNELS.reduce((sum, ch) => {
          const row = own.find((c: CaptureChannel) => c.channel === ch);
          return sum + (row?.status === "complete" ? 1 : row?.status === "partial" ? 0.5 : 0);
        }, 0) / CHANNELS.length;
      return { participant: p, pipeline, captureCompletionPct: Math.round(completion * 100) };
    });
  }

  async getParticipant(id: string): Promise<Participant | null> {
    const { data, error } = await this.client.from("participants").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateParticipant(id: string, patch: Partial<Participant>): Promise<Participant> {
    const { data, error } = await this.client.from("participants").update(patch).eq("id", id).select().single();
    return must(data, error, "participant");
  }

  async getCaptureChannels(participantId: string): Promise<CaptureChannel[]> {
    const { data, error } = await this.client
      .from("capture_channels")
      .select("*")
      .eq("participant_id", participantId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async updateCaptureChannel(
    participantId: string,
    channel: CaptureChannelName,
    patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
  ): Promise<CaptureChannel> {
    const { data, error } = await this.client
      .from("capture_channels")
      .upsert(
        { participant_id: participantId, channel, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "participant_id,channel" }
      )
      .select()
      .single();
    return must(data, error, "capture channel");
  }

  async submitCapture(participantId: string): Promise<Pipeline> {
    const { data, error } = await this.client.rpc("submit_capture", { p_participant_id: participantId });
    if (error) throw new Error(error.message);
    return data as Pipeline;
  }

  async getBiomarkers(participantId: string): Promise<Biomarker[]> {
    const { data, error } = await this.client
      .from("biomarkers")
      .select("*")
      .eq("participant_id", participantId)
      .order("pillar")
      .order("label");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker> {
    const { data, error } = await this.client
      .from("biomarkers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return must(data, error, "biomarker");
  }

  async getAiDraft(participantId: string): Promise<AiDraft | null> {
    const { data, error } = await this.client.from("ai_draft").select("*").eq("participant_id", participantId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateAiDraft(participantId: string, patch: Partial<AiDraft>): Promise<AiDraft> {
    const { data, error } = await this.client
      .from("ai_draft")
      .update({ ...patch, edited_by_admin: true })
      .eq("participant_id", participantId)
      .select()
      .single();
    return must(data, error, "AI draft");
  }

  async getReviews(participantId: string): Promise<Review[]> {
    const { data, error } = await this.client.from("reviews").select("*").eq("participant_id", participantId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async signOff(
    participantId: string,
    stage: ReviewStage,
    data: { reviewer_name: string; reviewer_credential: string; notes: string }
  ): Promise<Review> {
    const { data: row, error } = await this.client.rpc("sign_off", {
      p_participant_id: participantId,
      p_stage: stage,
      p_reviewer_name: data.reviewer_name,
      p_reviewer_credential: data.reviewer_credential,
      p_notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return row as Review;
  }

  async getPipeline(participantId: string): Promise<Pipeline | null> {
    const { data, error } = await this.client.from("pipeline").select("*").eq("participant_id", participantId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async releaseCard(participantId: string): Promise<Pipeline> {
    const { data, error } = await this.client.rpc("release_card", { p_participant_id: participantId });
    if (error) throw new Error(error.message);
    return data as Pipeline;
  }

  async resolveAttention(participantId: string): Promise<Pipeline> {
    const { data, error } = await this.client.rpc("resolve_attention", { p_participant_id: participantId });
    if (error) throw new Error(error.message);
    return data as Pipeline;
  }

  async getSignedCard(participantId: string): Promise<SignedCard | null> {
    const pipeline = await this.getPipeline(participantId);
    if (!pipeline || pipeline.state !== "delivered") return null;
    const [participant, aiDraft, biomarkers, reviews] = await Promise.all([
      this.getParticipant(participantId),
      this.getAiDraft(participantId),
      this.getBiomarkers(participantId),
      this.getReviews(participantId),
    ]);
    if (!participant || !aiDraft) return null;
    return { participant, aiDraft, biomarkers, reviews };
  }

  async listFiles(participantId: string): Promise<FileRecord[]> {
    const { data, error } = await this.client.from("files").select("*").eq("participant_id", participantId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async uploadFile(participantId: string, kind: FileKind, file: UploadableFile): Promise<FileRecord> {
    const bucket = BUCKET_BY_KIND[kind];
    const path = `${participantId}/${Date.now()}-${file.filename}`;
    const { error: uploadError } = await this.client.storage
      .from(bucket)
      .upload(path, file.blob, { contentType: file.contentType });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await this.client
      .from("files")
      .insert({ participant_id: participantId, kind, storage_path: path, extracted: false })
      .select()
      .single();
    return must(data, error, "file");
  }

  async getFileUrl(fileId: string): Promise<string | null> {
    const { data: fileRow, error: fileErr } = await this.client
      .from("files")
      .select("*")
      .eq("id", fileId)
      .maybeSingle();
    if (fileErr || !fileRow) return null;

    const bucket = BUCKET_BY_KIND[fileRow.kind as FileKind];
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(fileRow.storage_path, 600);
    if (error || !data) return null;
    return data.signedUrl;
  }

  async listDailyLogs(participantId: string): Promise<DailyLog[]> {
    const { data, error } = await this.client
      .from("daily_logs")
      .select("*")
      .eq("participant_id", participantId)
      .order("log_date");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async upsertDailyLog(
    participantId: string,
    logDate: string,
    patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>
  ): Promise<DailyLog> {
    const { data, error } = await this.client
      .from("daily_logs")
      .upsert({ participant_id: participantId, log_date: logDate, ...patch }, { onConflict: "participant_id,log_date" })
      .select()
      .single();
    return must(data, error, "daily log");
  }
}

export function createSupabaseRepository(): SupabaseRepository | null {
  const client = getSupabaseClient();
  if (!client) return null;
  return new SupabaseRepository(client);
}
