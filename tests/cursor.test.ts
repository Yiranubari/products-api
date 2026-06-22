import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import { BadCursorError } from "@/exceptions/bad-cursor";

describe("cursor codec", () => {
  it("round-trips a cursor unchanged", () => {
    const original = {
      createdAt: new Date("2020-01-02T03:04:05.000Z"),
      id: 12345,
    };
    const decoded = decodeCursor(encodeCursor(original));
    expect(decoded.id).toBe(original.id);
    expect(decoded.createdAt.toISOString()).toBe(
      original.createdAt.toISOString(),
    );
  });

  it("produces a URL-safe string", () => {
    const s = encodeCursor({ createdAt: new Date(), id: 1 });
    expect(s).not.toMatch(/[+/=]/);
  });

  it("rejects non-base64 garbage", () => {
    expect(() => decodeCursor("!!!not base64!!!")).toThrow(BadCursorError);
  });

  it("rejects valid base64 that isn't JSON", () => {
    const notJson = Buffer.from("hello world", "utf8").toString("base64url");
    expect(() => decodeCursor(notJson)).toThrow(BadCursorError);
  });

  it("rejects JSON of the wrong shape", () => {
    const wrong = Buffer.from(JSON.stringify({ foo: "bar" }), "utf8").toString(
      "base64url",
    );
    expect(() => decodeCursor(wrong)).toThrow(BadCursorError);
  });

  it("rejects a non-numeric id", () => {
    const badId = Buffer.from(
      JSON.stringify({ c: new Date().toISOString(), i: "x" }),
      "utf8",
    ).toString("base64url");
    expect(() => decodeCursor(badId)).toThrow(BadCursorError);
  });

  it("rejects an invalid date", () => {
    const badDate = Buffer.from(
      JSON.stringify({ c: "not-a-date", i: 1 }),
      "utf8",
    ).toString("base64url");
    expect(() => decodeCursor(badDate)).toThrow(BadCursorError);
  });
});
