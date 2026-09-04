import { describe, expect, it } from "vitest";

import {
  chunkByBytes,
  parseSessionMap,
  serializeSessionMap,
  utf8ByteLength,
} from "./sessionCodec";

const LIMIT = 1800;

describe("chunkByBytes", () => {
  it("leaves a value under the limit in one piece", () => {
    expect(chunkByBytes("a".repeat(500))).toEqual(["a".repeat(500)]);
  });

  it("returns nothing for an empty value", () => {
    expect(chunkByBytes("")).toEqual([]);
  });

  it("keeps every chunk within the byte limit", () => {
    // A realistically sized session: two JWTs plus a user object.
    const value = "x".repeat(3200);
    for (const chunk of chunkByBytes(value)) {
      expect(utf8ByteLength(chunk)).toBeLessThanOrEqual(LIMIT);
    }
  });

  it("round-trips exactly, so nothing is lost or duplicated", () => {
    const value = JSON.stringify({ token: "y".repeat(2500), user: { name: "James Chen" } });
    expect(chunkByBytes(value).join("")).toBe(value);
  });

  it("measures multi-byte characters by bytes, not characters", () => {
    // 900 three-byte characters = 2700 bytes. Counting characters would see 900
    // and wrongly emit a single chunk that blows past the 1800-byte cap.
    const value = "の".repeat(900);
    const chunks = chunkByBytes(value);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(utf8ByteLength(chunk)).toBeLessThanOrEqual(LIMIT);
    expect(chunks.join("")).toBe(value);
  });

  it("never splits a surrogate pair", () => {
    // Emoji are 4 bytes / 2 UTF-16 code units. A naive .slice() would cut one in
    // half, and the rejoined string would be corrupt rather than merely wrong.
    const value = "🧬".repeat(600);
    const chunks = chunkByBytes(value);

    expect(chunks.join("")).toBe(value);
    for (const chunk of chunks) {
      expect(chunk).toBe(Array.from(chunk).join(""));
      expect(utf8ByteLength(chunk)).toBeLessThanOrEqual(LIMIT);
    }
  });

  it("still emits a chunk when one character exceeds the limit", () => {
    // Degenerate, but must not loop forever or drop the character.
    expect(chunkByBytes("🧬", 2)).toEqual(["🧬"]);
  });
});

describe("session map codec", () => {
  it("round-trips the storage map", () => {
    const map = {
      "sb-abc-auth-token": '{"access_token":"jwt"}',
      "sb-abc-auth-token-code-verifier": "verifier",
    };
    expect(parseSessionMap(serializeSessionMap(map))).toEqual(map);
  });

  it("treats missing, corrupt or foreign payloads as signed out", () => {
    // A torn write or an older format must not reach supabase-js.
    expect(parseSessionMap(null)).toEqual({});
    expect(parseSessionMap("")).toEqual({});
    expect(parseSessionMap("not json")).toEqual({});
    expect(parseSessionMap("[1,2,3]")).toEqual({});
    expect(parseSessionMap('"a string"')).toEqual({});
  });

  it("drops non-string entries rather than passing them through", () => {
    expect(parseSessionMap('{"good":"v","bad":42,"worse":{"nested":true}}')).toEqual({
      good: "v",
    });
  });

  it("survives a full chunk round trip", () => {
    const map = { "sb-abc-auth-token": JSON.stringify({ token: "z".repeat(4000) }) };
    const rejoined = chunkByBytes(serializeSessionMap(map)).join("");
    expect(parseSessionMap(rejoined)).toEqual(map);
  });
});
