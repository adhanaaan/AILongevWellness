import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { validateUploadSize } from "@/lib/data/uploadLimits";
import {
  uploadFileAction,
  updateCaptureChannelAction,
  updateSectionStatusAction,
  listFilesAction,
} from "@/lib/data/actions";
import type { CaptureChannelName, FileKind, FileRecord, OnboardingSectionKey } from "@/lib/types/db";

/**
 * A human-readable filename from a storage path. Real uploads are stored at
 * `${participantId}/${timestamp}-${filename}` (see SupabaseRepository.uploadFile),
 * mock uploads at `mock://${participantId}/${filename}`. Take the basename and
 * strip the leading `${timestamp}-` prefix so the participant sees the name of
 * the file they actually chose, not a uuid/path.
 */
export function fileDisplayName(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? storagePath;
  return base.replace(/^\d{10,}-/, "");
}

export interface ChannelUploadConfig {
  /** Storage bucket kind + size-limit key. */
  kind: FileKind;
  /** capture_channels row this section maps to. */
  channel: CaptureChannelName;
  /** Onboarding section key marked done on a verified upload. */
  section: OnboardingSectionKey;
  /** MIME types passed to the document picker. */
  pickerTypes: string[];
  /** The real extraction endpoint; returns the keys it read off the file. */
  extract: (token: string, participantId: string, fileId: string) => Promise<{ extracted: string[] }>;
  /** Short label used in messages, e.g. "lab report". */
  noun: string;
  /** True when opened from outside onboarding (?mode=edit) — go back, don't advance. */
  isEditing: boolean;
}

export type UploadPhase = "idle" | "uploading" | "extracting";

export interface ChannelUploadState {
  phase: UploadPhase;
  busy: boolean;
  error: string | null;
  /** Non-fatal note, e.g. "uploaded, we'll read it shortly". */
  notice: string | null;
  /** Files already uploaded for this channel (real backend only). */
  files: FileRecord[];
  /** Pick a file and run the full upload → extract → verify flow. */
  pickAndUpload: () => Promise<void>;
  /** Leave without uploading (uploads are optional). */
  skip: () => void;
}

/**
 * Shared upload flow for the three capture channels (lab reports, body
 * composition, wearables). Unlike the old fire-and-forget path, this AWAITS
 * extraction and only marks the section "done" when the file actually yielded
 * health data — so an unreadable or wrong-document upload surfaces a real error
 * and a retry instead of a silent, empty "Done".
 */
export function useChannelUpload(config: ChannelUploadConfig): ChannelUploadState {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);

  const loadFiles = useCallback(async () => {
    if (!participantId || !isSupabaseConfigured) return;
    try {
      const all = await listFilesAction(participantId);
      setFiles(all.filter((f) => f.kind === config.kind));
    } catch {
      // Non-fatal — the list is a nicety, not a blocker.
    }
  }, [participantId, config.kind]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const leave = useCallback(() => {
    if (config.isEditing) router.back();
    else router.replace("/onboarding/capture");
  }, [config.isEditing, router]);

  const pickAndUpload = useCallback(async () => {
    if (!participantId) return;
    setError(null);
    setNotice(null);

    // No backend configured (sandbox/demo): simulate a verified upload so the
    // flow can still be completed end to end.
    if (!isSupabaseConfigured) {
      setPhase("extracting");
      await new Promise((r) => setTimeout(r, 400));
      await updateCaptureChannelAction(participantId, config.channel, {
        status: "complete",
        entered_by: "participant",
      });
      if (!config.isEditing) await updateSectionStatusAction(config.section, "done", participantId);
      setPhase("idle");
      leave();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: config.pickerTypes,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    setPhase("uploading");
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const sizeError = validateUploadSize(config.kind, blob.size);
      if (sizeError) {
        setError(sizeError);
        setPhase("idle");
        return;
      }

      const fileRecord = await uploadFileAction(participantId, config.kind, {
        blob,
        filename: asset.name,
        contentType: asset.mimeType ?? (Platform.OS === "web" ? blob.type : undefined),
      });
      // Mark uploaded-but-unverified so an interrupted extraction never leaves
      // the section falsely "done".
      await updateCaptureChannelAction(participantId, config.channel, {
        status: "partial",
        entered_by: "participant",
      });
      await loadFiles();

      if (!session?.access_token) {
        setPhase("idle");
        setNotice(`Saved. We'll read your ${config.noun} shortly.`);
        return;
      }

      setPhase("extracting");
      let extracted: string[] = [];
      try {
        const res = await config.extract(session.access_token, participantId, fileRecord.id);
        extracted = res.extracted ?? [];
      } catch (e) {
        setPhase("idle");
        setError(
          e instanceof Error
            ? e.message
            : `We couldn't read your ${config.noun}. Please try another file.`
        );
        return;
      }

      if (extracted.length === 0) {
        setPhase("idle");
        setError(
          `We couldn't find any health data in that file. Please check it's the right document (a ${config.noun}, not a random photo or PDF) and try again.`
        );
        return;
      }

      // Real data landed — now it's genuinely done.
      await updateCaptureChannelAction(participantId, config.channel, {
        status: "complete",
        entered_by: "participant",
      });
      if (!config.isEditing) await updateSectionStatusAction(config.section, "done", participantId);
      leave();
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
  }, [participantId, session, config, loadFiles, leave]);

  // "I'll add this later" — return the same way a completed upload would, so an
  // edit-mode visit (opened from the hub/Tracking post-onboarding) goes back
  // where it came from instead of being dumped into the onboarding hub.
  const skip = useCallback(() => {
    leave();
  }, [leave]);

  return {
    phase,
    busy: phase !== "idle",
    error,
    notice,
    files,
    pickAndUpload,
    skip,
  };
}
