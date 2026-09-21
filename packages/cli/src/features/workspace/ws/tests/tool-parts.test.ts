import { describe, expect, test } from "bun:test";
import {
  appendTextPart,
  normalizeToolArgs,
  stringifyToolResult,
  TOOL_PAYLOAD_MAX,
  truncateUtf8,
  upsertToolCallPart,
} from "../cursor-sdk.ts";

describe("tool payload helpers", () => {
  test("truncateUtf8 appends ellipsis past max", () => {
    expect(truncateUtf8("abc", 3)).toBe("abc");
    expect(truncateUtf8("abcd", 3)).toBe("abc…");
  });

  test("normalizeToolArgs keeps small objects", () => {
    expect(normalizeToolArgs({ path: "x" })).toEqual({ path: "x" });
  });

  test("stringifyToolResult truncates huge strings", () => {
    const big = "x".repeat(TOOL_PAYLOAD_MAX + 10);
    const out = stringifyToolResult(big);
    expect(out?.endsWith("…")).toBe(true);
    expect(out!.length).toBe(TOOL_PAYLOAD_MAX + 1);
  });

  test("upsertToolCallPart updates by id and appendTextPart merges", () => {
    let parts = upsertToolCallPart([], {
      id: "1",
      name: "read",
      status: "running",
      args: { path: "a" },
    });
    parts = upsertToolCallPart(parts, {
      id: "1",
      name: "read",
      status: "completed",
      args: { path: "a" },
      result: "ok",
    });
    parts = appendTextPart(parts, "hola");
    parts = appendTextPart(parts, " mundo");
    expect(parts).toEqual([
      {
        type: "tool-call",
        id: "1",
        name: "read",
        args: { path: "a" },
        result: "ok",
      },
      { type: "text", text: "hola mundo" },
    ]);
  });
});
