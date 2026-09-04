import * as SecureStore from "expo-secure-store";

/**
 * Persists the web app's Supabase session in the platform keychain/keystore.
 *
 * Why this exists at all: inside a WebView the web app's `Platform.OS` is
 * "web", so supabase-js would persist to localStorage -- and WebKit applies its
 * script-writable-storage eviction to WKWebView, so a user can be silently
 * signed out between launches. The keychain is the durable store.
 *
 * Why it chunks: expo-secure-store documents a 2048-byte value limit on Android.
 * A Supabase session is an access JWT + refresh token + the full serialized user
 * object with metadata -- routinely 1.8-3 KB, i.e. straddling the limit. Failing
 * for some users and not others, depending on how much metadata their account
 * carries, is exactly the kind of bug that never reproduces on a developer's
 * device. Chunking is preferred over Supabase's documented encrypt-and-offload
 * pattern (aes-js + expo-crypto, ciphertext in AsyncStorage) because it needs no
 * dependencies and keeps every byte inside secure storage.
 */

const KEY = "aiw.session";
const COUNT_KEY = `${KEY}.__n`;
/** Conservative margin under Android's documented 2048-byte cap. */
const MAX_CHUNK_BYTES = 1800;
/** Survives reboots and is readable while the device is locked post-first-unlock. */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

function utf8Len(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Splits on UTF-8 byte length, not string length: user metadata can carry
 * non-ASCII (names, locales), where one character is up to 4 bytes, so counting
 * characters would under-measure and silently exceed the cap.
 *
 * Iterates with for...of so surrogate pairs are treated as one code point and
 * never split down the middle.
 */
export function chunkByBytes(value: string, maxBytes = MAX_CHUNK_BYTES): string[] {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const bytes = utf8Len(char.codePointAt(0)!);
    if (currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  if (current.length > 0) chunks.push(current);

  return chunks;
}

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
