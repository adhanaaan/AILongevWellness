import * as SecureStore from "expo-secure-store";

import { chunkByBytes } from "@aiw/shared/bridge";

/**
 * Persists the web app's Supabase session in the platform keychain/keystore.
 *
 * Why this exists at all: inside a WebView the web app's `Platform.OS` is
 * "web", so supabase-js would persist to localStorage -- and WebKit applies its
 * script-writable-storage eviction to WKWebView, so a user can be silently
 * signed out between launches. The keychain is the durable store.
 *
 * Why it chunks: expo-secure-store documents a 2048-byte value limit on Android,
 * and a Supabase session routinely lands at 1.8-3 KB -- straddling it, so it
 * would fail for some accounts and not others depending on how much metadata
 * they carry. Chunking is preferred over Supabase's documented
 * encrypt-and-offload pattern (aes-js + expo-crypto, ciphertext in AsyncStorage)
 * because it needs no dependencies and keeps every byte inside secure storage.
 * The splitting itself lives in @aiw/shared so it can be tested -- see
 * sessionCodec.test.ts for the multi-byte and surrogate-pair cases.
 */

const KEY = "aiw.session";
const COUNT_KEY = `${KEY}.__n`;
/** Survives reboots and is readable while the device is locked post-first-unlock. */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

async function readCount(): Promise<number> {
  const raw = await SecureStore.getItemAsync(COUNT_KEY, OPTIONS);
  const count = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export async function getSession(): Promise<string | null> {
  try {
    const count = await readCount();
    if (count === 0) return null;

    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${KEY}.${i}`, OPTIONS))
    );
    // A missing chunk means a torn write (killed mid-save). Half a session is
    // worse than none -- it would fail to parse downstream in a confusing place.
    if (parts.some((part) => part === null)) {
      await clearSession();
      return null;
    }
    return parts.join("");
  } catch {
    // Keychain unavailable (locked, or hardware-backed store failing). Treat as
    // signed out rather than crashing the launch.
    return null;
  }
}

export async function setSession(value: string): Promise<void> {
  const chunks = chunkByBytes(value);
  const previousCount = await readCount();

  // Count last: until it's written, a partial set of chunks is simply ignored by
  // getSession, so an interrupted write leaves the OLD session readable rather
  // than a corrupt merge of old and new.
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${KEY}.${i}`, chunk, OPTIONS)));
  await SecureStore.setItemAsync(COUNT_KEY, String(chunks.length), OPTIONS);

  // Drop chunks left over from a previously longer session.
  if (previousCount > chunks.length) {
    await Promise.all(
      Array.from({ length: previousCount - chunks.length }, (_, i) =>
        SecureStore.deleteItemAsync(`${KEY}.${chunks.length + i}`, OPTIONS).catch(() => {})
      )
    );
  }
}

export async function clearSession(): Promise<void> {
  const count = await readCount();
  // Count first, so an interrupted clear can never leave chunks addressable.
  await SecureStore.deleteItemAsync(COUNT_KEY, OPTIONS).catch(() => {});
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(`${KEY}.${i}`, OPTIONS).catch(() => {})
    )
  );
}
