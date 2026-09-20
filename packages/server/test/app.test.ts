import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app.ts";
import { createMemoryChatService, createMemoryWorkspaceService } from "./memory-services.ts";

function testApp() {
  const workspaces = createMemoryWorkspaceService();
  return createApp({
    ws: { resolveUserId: async () => null },
    workspaces,
    chat: createMemoryChatService(workspaces),
    enableDocs: true,
  });
}

describe("server health", () => {
  test("GET /health returns ok", async () => {
    const response = await testApp().request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("OpenAPI docs", () => {
  test("GET /openapi.json includes /health when docs enabled", async () => {
    const response = await testApp().request("/openapi.json");

    expect(response.status).toBe(200);
    const spec = (await response.json()) as {
      paths?: Record<string, unknown>;
      info?: { title?: string };
    };
    expect(spec.info?.title).toBe("Chavez Harness API");
    expect(spec.paths).toHaveProperty("/health");
    expect(spec.paths).toHaveProperty("/api/auth/sign-in/email");
    expect(spec.paths).toHaveProperty("/ws");
    expect(spec.paths).toHaveProperty("/api/workspaces/bind");
  });

  test("GET /docs returns swagger UI when docs enabled", async () => {
    const response = await testApp().request("/docs");

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("swagger");
  });
});
