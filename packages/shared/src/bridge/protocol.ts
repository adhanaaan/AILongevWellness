import type { BridgeError, BridgeErrorCode } from "./types";

/**
 * Transport-agnostic messaging engine shared by both sides of the bridge.
 *
 * Owns envelopes, request/response correlation and timeouts. It knows nothing
 * about WebViews: the web side wires `send` to
 * `window.ReactNativeWebView.postMessage`, the native side to
 * `webViewRef.injectJavaScript`. Keeping it here means the correlation logic is
 * written and tested once rather than mirrored (and drifting) in two packages.
 */

export type Envelope =
  | { t: "req"; id: string; m: string; p: unknown }
  | { t: "res"; id: string; ok: true; r: unknown }
  | { t: "res"; id: string; ok: false; e: BridgeError }
  | { t: "evt"; m: string; p: unknown };

export const DEFAULT_TIMEOUT_MS = 10_000;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: BridgeError) => void;
  timer: ReturnType<typeof setTimeout>;
};

export interface BridgeCoreOptions {
  /** "w" (web) or "n" (native) — namespaces request ids so the two never collide. */
  origin: "w" | "n";
  /** Hand a serialized envelope to the transport. May throw if not connected. */
  send: (serialized: string) => void;
  onError?: (error: BridgeError, context?: Record<string, unknown>) => void;
}

export function bridgeError(code: BridgeErrorCode, message: string): BridgeError {
  return { code, message };
}

export class BridgeCore {
  private readonly options: BridgeCoreOptions;
  private readonly pending = new Map<string, Pending>();
  private readonly handlers = new Map<string, (params: unknown) => Promise<unknown> | unknown>();
  private readonly eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private seq = 0;

  constructor(options: BridgeCoreOptions) {
    this.options = options;
  }

  /** Register the handler for an incoming request method. One per method. */
  setHandler(method: string, handler: (params: never) => Promise<unknown> | unknown): void {
    this.handlers.set(method, handler as (params: unknown) => Promise<unknown> | unknown);
  }

  /** Subscribe to an incoming event. Returns an unsubscribe function. */
  onEvent(method: string, handler: (payload: never) => void): () => void {
    const set = this.eventHandlers.get(method) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.eventHandlers.set(method, set);
    return () => {
      set.delete(handler as (payload: unknown) => void);
    };
  }

  /** Send a request and await its reply. Rejects with a {@link BridgeError}. */
  request<T>(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `${this.options.origin}${++this.seq}`;

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(bridgeError("TIMEOUT", `No reply to "${method}" within ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      try {
        this.options.send(JSON.stringify({ t: "req", id, m: method, p: params } satisfies Envelope));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(bridgeError("NOT_READY", (error as Error)?.message ?? "Transport unavailable"));
      }
    });
  }

  /** Fire an event. Never throws — a dropped event must not break the caller. */
  emit(method: string, payload: unknown): void {
    try {
      this.options.send(JSON.stringify({ t: "evt", m: method, p: payload } satisfies Envelope));
    } catch {
      // Not connected. Events are advisory by construction.
    }
  }

  /** Feed a raw message in from the transport. */
  receive(serialized: string): void {
    let envelope: Envelope;
    try {
      envelope = JSON.parse(serialized) as Envelope;
    } catch {
      // Not ours. The WebView channel carries other traffic (extensions, dev
      // tooling), so a non-JSON message is expected noise, not an error.
      return;
    }
    if (!envelope || typeof envelope !== "object" || !("t" in envelope)) return;

    switch (envelope.t) {
      case "res":
        this.handleResponse(envelope);
        return;
      case "req":
        void this.handleRequest(envelope);
        return;
      case "evt":
        this.handleEvent(envelope);
        return;
    }
  }

  /** Fail every in-flight request, e.g. when the WebView is being remounted. */
  reset(reason: string): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(bridgeError("NOT_READY", reason));
    }
    this.pending.clear();
  }

  private handleResponse(envelope: Extract<Envelope, { t: "res" }>): void {
    const entry = this.pending.get(envelope.id);
    // Not an error: a reply that arrives after its timeout has no waiter left.
    if (!entry) return;

    clearTimeout(entry.timer);
    this.pending.delete(envelope.id);

    if (envelope.ok) entry.resolve(envelope.r);
    else entry.reject(envelope.e);
  }

  private async handleRequest(envelope: Extract<Envelope, { t: "req" }>): Promise<void> {
    const handler = this.handlers.get(envelope.m);

    if (!handler) {
      // Expected whenever a newer counterpart calls a method this build predates.
      this.reply(envelope.id, false, bridgeError("UNSUPPORTED", `No handler for "${envelope.m}"`));
      return;
    }

    try {
      const result = await handler(envelope.p);
      this.reply(envelope.id, true, result);
    } catch (error) {
      const message = (error as Error)?.message ?? "Handler threw";
      this.options.onError?.(bridgeError("HANDLER_ERROR", message), { method: envelope.m });
      this.reply(envelope.id, false, bridgeError("HANDLER_ERROR", message));
    }
  }

  private handleEvent(envelope: Extract<Envelope, { t: "evt" }>): void {
    const handlers = this.eventHandlers.get(envelope.m);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(envelope.p);
      } catch (error) {
        // One bad subscriber must not stop the others.
        this.options.onError?.(
          bridgeError("HANDLER_ERROR", (error as Error)?.message ?? "Event handler threw"),
          { method: envelope.m }
        );
      }
    }
  }

  private reply(id: string, ok: boolean, payload: unknown): void {
    const envelope = ok
      ? ({ t: "res", id, ok: true, r: payload } satisfies Envelope)
      : ({ t: "res", id, ok: false, e: payload as BridgeError } satisfies Envelope);
    try {
      this.options.send(JSON.stringify(envelope));
    } catch {
      // Counterpart is gone; its own request will time out.
    }
  }
}
