import { describe, expect, test } from "bun:test";
import { REPLY_ERROR_TEXT, resolveMockReply } from "./mock-reply";

describe("resolveMockReply", () => {
  test("devuelve el eco del texto", () => {
    expect(resolveMockReply("  hola  ")).toBe("  hola  ");
  });

  test("falla si el texto recortado es error", () => {
    expect(() => resolveMockReply(" Error ")).toThrow(REPLY_ERROR_TEXT);
  });
});
