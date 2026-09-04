import { serializeSessionMap } from "@aiw/shared/bridge";

import type { NativeBridge } from "./nativeBridge";

/** The shape supabase-js accepts for its auth `storage` option. */
export interface SupabaseStorageLike {
  getItem(key: string): string | Promise<string | null> | null;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * Backs supabase-js's auth storage with the shell's keychain, via the bridge.
 *
 * Hydrate-once + write-through rather than a straight proxy. A proxy would make
 * every storage read a bridge round-trip and tie auth to bridge liveness -- so a
 * momentarily unresponsive shell would look like a signed-out user. Instead the
 * whole map is read once at boot into memory, reads are served synchronously
 * from there, and writes update memory first and are mirrored to the keychain
 * afterwards.
 *
 * The entire map is written as one blob because supabase-js uses more than one
 * key (the session, plus a PKCE code verifier during sign-in) and they must stay
 * consistent with each other. The shell chunks it to stay under Android's
 * SecureStore value limit.
 */
export function createBridgeStorage(
  bridge: NativeBridge,
  seed: Record<string, string>
): SupabaseStorageLike {
  const cache = new Map(Object.entries(seed));
  let flushing: Promise<void> | null = null;
  let flushAgain = false;

  async function flush(): Promise<void> {
    // Coalesce: supabase-js writes several keys in quick succession during a
    // token refresh, and each one would otherwise be a separate keychain write.
    if (flushing) {
      flushAgain = true;
      return flushing;
    }

    flushing = (async () => {
      do {
        flushAgain = false;
        try {
          if (cache.size === 0) {
            await bridge.request("session:clear", {});
          } else {
            await bridge.request("session:set", {
              value: serializeSessionMap(Object.fromEntries(cache)),
            });
          }
        } catch {
          // Keychain unavailable or shell unresponsive. The in-memory cache is
          // still correct for this session, so the user stays signed in now and
          // only loses persistence across a relaunch -- far better than
          // surfacing a write failure as an auth error.
        }
      } while (flushAgain);
    })();

    try {
      await flushing;
    } finally {
      flushing = null;
    }
  }

  return {
    getItem(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
      void flush();
    },
    removeItem(key) {
      cache.delete(key);
      void flush();
    },
  };
}
