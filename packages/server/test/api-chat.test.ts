import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "../src/db/auth/auth-schema.ts";
import db from "../src/lib/db.ts";
import { auth } from "../src/lib/auth/index.ts";
import { createApp } from "../src/app.ts";

const EMAIL = `api-chat-${Date.now()}@test.local`;
const PASSWORD = "TestPassword123!";

describe("REST chat API", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const signUp = await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: "API Chat" },
    });
    userId = signUp.user.id;
    const signIn = await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
    });
    token = signIn.token!;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
  });

  test("bind → create session → post message", async () => {
    const app = createApp({
      ws: { resolveUserId: async () => userId },
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const bind = await app.request("/api/workspaces/bind", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: `/tmp/api-${Date.now()}` }),
    });
    expect(bind.status).toBe(200);
    const workspace = (await bind.json()) as { id: string; path: string };
    expect(workspace.id).toBeTruthy();

    const create = await app.request(`/api/workspaces/${workspace.id}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "plan", provider: "local", model: "eco" }),
    });
    expect(create.status).toBe(200);
    const session = (await create.json()) as {
      id: string;
      provider: string;
      model: string;
    };
    expect(session.provider).toBe("local");
    expect(session.model).toBe("eco");

    const post = await app.request(`/api/sessions/${session.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: "desde api",
        mode: "plan",
        provider: "local",
        model: "eco",
      }),
    });
    expect(post.status).toBe(200);
    const body = (await post.json()) as {
      created: boolean;
      assistantMessage: { parts: { type: string; text?: string }[] };
    };
    expect(body.created).toBe(true);
    expect(body.assistantMessage.parts[0]).toMatchObject({ type: "text", text: "desde api" });

    const get = await app.request(`/api/sessions/${session.id}`, { headers });
    expect(get.status).toBe(200);
    const full = (await get.json()) as { messages: unknown[] };
    expect(full.messages).toHaveLength(2);
  });

  test("unauthorized without token", async () => {
    const app = createApp();
    const res = await app.request("/api/workspaces");
    expect(res.status).toBe(401);
  });

  test("GET /api/workspaces/:id/connections", async () => {
    const app = createApp({
      ws: { resolveUserId: async () => userId },
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const bind = await app.request("/api/workspaces/bind", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: `/tmp/conn-${Date.now()}` }),
    });
    expect(bind.status).toBe(200);
    const workspace = (await bind.json()) as {
      id: string;
      daemonDesired: string;
    };
    expect(workspace.daemonDesired).toBe("off");

    const res = await app.request(`/api/workspaces/${workspace.id}/connections`, {
      headers,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      daemon: string;
      daemonDesired: string;
      machineStatus: string;
      connections: unknown[];
    };
    expect(body.daemon).toBe("offline");
    expect(body.daemonDesired).toBe("off");
    expect(body.machineStatus).toBe("offline");
    expect(Array.isArray(body.connections)).toBe(true);
  });

  test("GET /api/machine and POST daemon without host → 409", async () => {
    const app = createApp({
      ws: { resolveUserId: async () => userId },
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const machine = await app.request("/api/machine", { headers });
    expect(machine.status).toBe(200);
    const machineBody = (await machine.json()) as { status: string };
    expect(machineBody.status).toBe("offline");

    const bind = await app.request("/api/workspaces/bind", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: `/tmp/daemon-api-${Date.now()}` }),
    });
    const workspace = (await bind.json()) as { id: string };

    const activate = await app.request(`/api/workspaces/${workspace.id}/daemon`, {
      method: "POST",
      headers,
      body: JSON.stringify({ desired: "on", source: "web" }),
    });
    expect(activate.status).toBe(409);
  });

  test("DELETE /api/sessions/:id removes session", async () => {
    const app = createApp({
      ws: { resolveUserId: async () => userId },
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const bind = await app.request("/api/workspaces/bind", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: `/tmp/del-session-${Date.now()}` }),
    });
    const workspace = (await bind.json()) as { id: string };

    const create = await app.request(`/api/workspaces/${workspace.id}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "plan", provider: "local", model: "eco" }),
    });
    const session = (await create.json()) as { id: string };

    const del = await app.request(`/api/sessions/${session.id}`, {
      method: "DELETE",
      headers,
    });
    expect(del.status).toBe(200);
    const body = (await del.json()) as { chatSessionId: string };
    expect(body.chatSessionId).toBe(session.id);

    const get = await app.request(`/api/sessions/${session.id}`, { headers });
    expect(get.status).toBe(404);
  });
});
