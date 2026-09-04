/**
 * How the auth session crosses the bridge and lands in the keychain.
 *
 * Lives here because it is genuinely a two-sided contract: the web app
 * serializes supabase-js's whole storage map to JSON and hands it over, and the
 * shell splits that string to fit the platform keystore. Getting either half
 * wrong silently signs users out, so both halves are specified and tested in
 * one place rather than mirrored across two packages.
 */

/**
 * Conservative margin under Android's documented 2048-byte SecureStore value
 * limit. A Supabase session (access JWT + refresh token + serialized user with
 * metadata) routinely lands at 1.8-3 KB -- i.e. straddling the cap, so it fails
 * for some accounts and not others depending on how much metadata they carry.
 */
export const MAX_SECURE_STORE_CHUNK_BYTES = 1800;

function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/** UTF-8 byte length of a string, without allocating a TextEncoder. */
export function utf8ByteLength(value: string): number {
  let total = 0;
  for (const char of value) total += utf8Length(char.codePointAt(0)!);
  return total;
}

/**
 * Splits on UTF-8 BYTE length, not string length.
 *
 * User metadata carries non-ASCII (names, locales) where one character is up to
 * 4 bytes, so counting characters would under-measure and quietly exceed the
 * platform cap. Iterating with for...of yields whole code points, so a surrogate
 * pair is never split down the middle -- which would corrupt the JSON on rejoin.
 */
export function chunkByBytes(value: string, maxBytes = MAX_SECURE_STORE_CHUNK_BYTES): string[] {
  if (value === "") return [];

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const bytes = utf8Length(char.codePointAt(0)!);
    if (currentBytes + bytes > maxBytes && current !== "") {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  if (current !== "") chunks.push(current);

  return chunks;
}

/** Serializes supabase-js's storage map for transport. */
export function serializeSessionMap(map: Record<string, string>): string {
  return JSON.stringify(map);
}

/**
 * Reads the map back, tolerating anything that isn't the shape we wrote --
 * corruption, a torn write, or a format from an older build. Returning an empty
 * map means "signed out", which is recoverable; handing supabase-js a malformed
 * session is not.
 */
export function parseSessionMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}
