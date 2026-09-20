import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app.ts";

describe("server health", () => {
  test("GET /health returns ok", async () => {
    const response = await createApp({
      ws: { resolveUserId: async () => null },
    }).request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("OpenAPI docs", () => {
  test("GET /openapi.json includes /health when docs enabled", async () => {
    const response = await createApp({
      ws: { resolveUserId: async () => null },
      enableDocs: true,
    }).request("/openapi.json");

    expect(response.status).toBe(200);
    const spec = (await response.json()) as {
      paths?: Record<string, unknown>;
      info?: { title?: string };
    };
    expect(spec.info?.title).toBe("Chavez Harness API");
    expect(spec.paths).toHaveProperty("/health");
    expect(spec.paths).toHaveProperty("/api/auth/sign-in/email");
    expect(spec.paths).toHaveProperty("/ws");
  });

  test("GET /docs returns swagger UI when docs enabled", async () => {
    const response = await createApp({
      ws: { resolveUserId: async () => null },
      enableDocs: true,
    }).request("/docs");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("swagger");
  });
});
