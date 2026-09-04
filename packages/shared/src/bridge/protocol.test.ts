import { describe, expect, it, vi } from "vitest";

import { BridgeCore } from "./protocol";
import type { BridgeError } from "./types";

/** Two cores wired to each other, as web <-> native are through the WebView. */
function connectedPair() {
  const refs: { web?: BridgeCore; native?: BridgeCore } = {};
  refs.web = new BridgeCore({ origin: "w", send: (s) => refs.native!.receive(s) });
  refs.native = new BridgeCore({ origin: "n", send: (s) => refs.web!.receive(s) });
  return { web: refs.web, native: refs.native };
}

async function expectBridgeError(promise: Promise<unknown>): Promise<BridgeError> {
  try {
    await promise;
    throw new Error("expected the request to reject");
  } catch (error) {
    return error as BridgeError;
  }
}

describe("BridgeCore", () => {
  it("round-trips a request to the other side's handler", async () => {
    const { web, native } = connectedPair();
    native.setHandler("session:get", (p: { who: string }) => ({ value: `sess-${p.who}` }));

    await expect(web.request("session:get", { who: "james" })).resolves.toEqual({
      value: "sess-james",
    });
  });

  it("correlates concurrent requests independently", async () => {
    const { web, native } = connectedPair();
    native.setHandler("echo", async (p: { delay: number; value: string }) => {
      await new Promise((r) => setTimeout(r, p.delay));
      return p.value;
    });

    // The slow one is issued first, so a naive implementation that assumes
    // replies arrive in order would swap these.
    await expect(
      Promise.all([
        web.request("echo", { delay: 30, value: "slow" }),
        web.request("echo", { delay: 1, value: "fast" }),
      ])
    ).resolves.toEqual(["slow", "fast"]);
  });

  it("reports UNSUPPORTED for a method the other side doesn't implement", async () => {
    // The normal case when a freshly deployed web app calls into a shell build
    // that predates the method, so it must be a clean answer rather than a hang.
    const { web } = connectedPair();
    const error = await expectBridgeError(web.request("notifications:cancel", {}));
    expect(error.code).toBe("UNSUPPORTED");
  });

  it("reports HANDLER_ERROR with the handler's own message", async () => {
    const { web, native } = connectedPair();
    native.setHandler("session:set", () => {
      throw new Error("keychain unavailable");
    });

    const error = await expectBridgeError(web.request("session:set", { value: "x" }));
    expect(error).toMatchObject({ code: "HANDLER_ERROR", message: "keychain unavailable" });
  });

  it("times out when no reply arrives", async () => {
    const web = new BridgeCore({ origin: "w", send: () => {} });
    const error = await expectBridgeError(web.request("session:get", {}, 20));
    expect(error.code).toBe("TIMEOUT");
  });

  it("reports NOT_READY when the transport itself throws", async () => {
    const web = new BridgeCore({
      origin: "w",
      send: () => {
        throw new Error("ReactNativeWebView is unavailable");
      },
    });
    const error = await expectBridgeError(web.request("session:get", {}));
    expect(error.code).toBe("NOT_READY");
  });

  it("delivers events to subscribers and honours unsubscribe", () => {
    const { web, native } = connectedPair();
    const handler = vi.fn();

    const unsubscribe = web.onEvent("app:resumed", handler);
    native.emit("app:resumed", {});
    unsubscribe();
    native.emit("app:resumed", {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("keeps delivering events after one subscriber throws", () => {
    const { web, native } = connectedPair();
    const second = vi.fn();

    web.onEvent("connectivity:changed", () => {
      throw new Error("bad subscriber");
    });
    web.onEvent("connectivity:changed", second);
    native.emit("connectivity:changed", { isConnected: false });

    expect(second).toHaveBeenCalledOnce();
  });

  it("rejects in-flight requests on reset", async () => {
    // Used when the WebView is remounted after a crash: the old request will
    // never be answered, so it must fail rather than sit until its timeout.
    const web = new BridgeCore({ origin: "w", send: () => {} });
    const inflight = web.request("session:get", {}, 5_000);
    web.reset("WebView remounting");

    const error = await expectBridgeError(inflight);
    expect(error.code).toBe("NOT_READY");
  });

  it("ignores non-protocol traffic on the channel", () => {
    // The WebView message channel is shared with browser extensions and dev
    // tooling, so unparseable or foreign messages are expected noise.
    const { web } = connectedPair();
    expect(() => {
      web.receive("not json at all");
      web.receive('{"unrelated":true}');
      web.receive(JSON.stringify({ t: "res", id: "w999", ok: true, r: {} }));
    }).not.toThrow();
  });
});
