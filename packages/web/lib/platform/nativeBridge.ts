import {
  BridgeCore,
  NATIVE_HOST_FLAG,
  PROTOCOL_VERSION,
  WEB_RECEIVER_GLOBAL,
  type BootConfig,
  type NativeToWebEvents,
  type WebToNativeRequests,
} from "@aiw/shared/bridge";

/**
 * Web-side half of the bridge to the native shell.
 *
 * Every method here is a no-op or a rejection in a plain browser -- the web app
 * is the product and must work fully without the shell. Callers should go
 * through lib/platform's helpers rather than touching this directly.
 */

type NativeWindow = Window & {
  __AIW_NATIVE_HOST__?: boolean;
  __AIW_BRIDGE_RECEIVE__?: (serialized: string) => void;
  ReactNativeWebView?: { postMessage: (data: string) => void };
};

// The globals are named by string constants in @aiw/shared so both sides agree,
// but a `declare` block needs literals. Fail loudly at module load if they ever
// drift, rather than silently never detecting the shell.
if (NATIVE_HOST_FLAG !== "__AIW_NATIVE_HOST__" || WEB_RECEIVER_GLOBAL !== "__AIW_BRIDGE_RECEIVE__") {
  throw new Error("Bridge global names drifted from their declared types in nativeBridge.ts");
}

function nativeWindow(): NativeWindow | null {
  return typeof window === "undefined" ? null : (window as NativeWindow);
}

const HANDSHAKE_TIMEOUT_MS = 10_000;
const AVAILABILITY_TIMEOUT_MS = 400;
const AVAILABILITY_POLL_MS = 20;

export class NativeBridge {
  private readonly core: BridgeCore;

  constructor() {
    this.core = new BridgeCore({
      origin: "w",
      send: (serialized) => {
        const w = nativeWindow();
        if (!w?.ReactNativeWebView) throw new Error("ReactNativeWebView is unavailable");
        w.ReactNativeWebView.postMessage(serialized);
      },
    });

    const w = nativeWindow();
    if (w) w.__AIW_BRIDGE_RECEIVE__ = (serialized) => this.core.receive(serialized);
  }

  static isAvailable(): boolean {
    const w = nativeWindow();
    return Boolean(w?.__AIW_NATIVE_HOST__ || w?.ReactNativeWebView);
  }

  /**
   * Polls instead of checking once.
   *
   * `window.ReactNativeWebView` is injected by react-native-webview itself and
   * is normally present before any page script -- but not reliably so on a cold
   * load or reload. Losing that race means booting in browser mode, never
   * wiring the bridge, and then failing every native call for the whole session.
   * A few hundred milliseconds at boot is cheap insurance against that; the app
   * already waits on font loading anyway.
   */
  static async waitForAvailability(
    timeoutMs = AVAILABILITY_TIMEOUT_MS,
    pollMs = AVAILABILITY_POLL_MS
  ): Promise<boolean> {
    if (NativeBridge.isAvailable()) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (NativeBridge.isAvailable()) return true;
    }
    return false;
  }

  /** Handshake. Returns null if the shell never answers — caller falls back to web mode. */
  async init(): Promise<BootConfig | null> {
    try {
      return await this.core.request<BootConfig>(
        "bridge:init",
        { protocolVersion: PROTOCOL_VERSION },
        HANDSHAKE_TIMEOUT_MS
      );
    } catch {
      return null;
    }
  }

  request<M extends keyof WebToNativeRequests>(
    method: M,
    params: WebToNativeRequests[M]["params"]
  ): Promise<WebToNativeRequests[M]["result"]> {
    return this.core.request<WebToNativeRequests[M]["result"]>(method, params);
  }

  onEvent<E extends keyof NativeToWebEvents>(
    event: E,
    handler: (payload: NativeToWebEvents[E]) => void
  ): () => void {
    return this.core.onEvent(event, handler as (payload: never) => void);
  }

  /** Answer a request from the shell (currently only Android hardware back). */
  setHandler(method: "navigation:back", handler: () => { handled: boolean }): void {
    this.core.setHandler(method, handler);
  }
}
