import { beforeEach, describe, expect, test } from "bun:test";
import type { ChatMessageDto, ChatSessionWithMessagesDto, WsReply } from "@chavez-harness/shared";
import { createElement } from "react";
import { createMemoryRouter, isRouteErrorResponse, type RouteObject } from "react-router";
import {
  getWorkspaceBridge,
  resetWorkspaceBridge,
  type WorkspaceBridge,
} from "../../workspace/bridge";
import {
  newSessionAction,
  newSessionLoader,
  rootLoader,
  sessionAction,
  sessionLoader,
} from "../handlers";
import { LOCAL_MODEL } from "../model";
import type { Session } from "../store";

function emptySession(id: string): ChatSessionWithMessagesDto {
  const now = new Date().toISOString();
  return {
    id,
    workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    title: null,
    mode: "plan",
    provider: "local",
    model: LOCAL_MODEL,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: null,
    messages: [],
  };
}

function installFakeBridge() {
  const sessions = new Map<string, ChatSessionWithMessagesDto>();
  let currentId: string | null = null;

  const fake = {
    getState: () => ({
      status: "synced" as const,
      path: "/tmp",
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      chatSessionId: currentId,
      error: null,
    }),
    getSession: (id: string) => sessions.get(id),
    createSession: async () => {
      const id = crypto.randomUUID();
      const session = emptySession(id);
      sessions.set(id, session);
      currentId = id;
      return session;
    },
    openLatestOrCreate: async () => {
      if (currentId && sessions.has(currentId)) return sessions.get(currentId)!;
      return fake.createSession();
    },
    openSession: async (id: string) => {
      const session = sessions.get(id);
      if (!session) throw new Error("missing");
      currentId = id;
      return session;
    },
    listSessions: async () => {
      return [...sessions.values()].map(
        ({ messages: _m, ...meta }) => meta,
      );
    },
    sendMessage: async (input: {
      chatSessionId: string;
      text: string;
      mode: "plan" | "build";
      model?: string;
    }): Promise<WsReply> => {
      const session = sessions.get(input.chatSessionId);
      if (!session) {
        return { type: "chat.send", id: "x", ok: false, error: "missing" };
      }
      const now = new Date().toISOString();
      const seq = (session.messages.at(-1)?.seq ?? 0) + 1;
      const user: ChatMessageDto = {
        id: crypto.randomUUID(),
        chatSessionId: input.chatSessionId,
        role: "user",
        mode: input.mode,
        provider: "local",
        model: input.model ?? LOCAL_MODEL,
        status: "done",
        error: null,
        parts: [{ type: "text", text: input.text }],
        usage: null,
        clientMessageId: null,
        seq,
        createdAt: now,
      };
      const isError = input.text.trim().toLowerCase() === "error";
      const assistant: ChatMessageDto = {
        id: crypto.randomUUID(),
        chatSessionId: input.chatSessionId,
        role: "assistant",
        mode: input.mode,
        provider: "local",
        model: input.model ?? LOCAL_MODEL,
        status: isError ? "error" : "done",
        error: isError ? "No se pudo obtener la respuesta" : null,
        parts: isError ? [] : [{ type: "text", text: input.text }],
        usage: null,
        clientMessageId: null,
        seq: seq + 1,
        createdAt: now,
      };
      const updated = {
        ...session,
        messages: [...session.messages, user, assistant],
        lastMessageAt: now,
      };
      sessions.set(input.chatSessionId, updated);
      return {
        type: "chat.send",
        id: "x",
        ok: true,
        data: { session: updated, userMessage: user, assistantMessage: assistant, created: true },
      };
    },
  } as unknown as WorkspaceBridge;

  resetWorkspaceBridge();
  const real = getWorkspaceBridge();
  Object.assign(real, fake);
  return real;
}

const routes: RouteObject[] = [
  {
    path: "/",
    children: [
      { index: true, loader: rootLoader },
      {
        path: "session/new",
        loader: newSessionLoader,
        action: newSessionAction,
        Component: () => null,
      },
      {
        id: "session",
        path: "session/:id",
        loader: sessionLoader,
        action: sessionAction,
        Component: () => null,
        errorElement: createElement(() => null),
      },
    ],
  },
];

function createTestRouter(initialEntries: string[] = ["/session/new"]) {
  return createMemoryRouter(routes, { initialEntries });
}

function form(text: string, mode: "plan" | "build" = "plan"): FormData {
  const body = new FormData();
  body.set("text", text);
  body.set("mode", mode);
  body.set("model", LOCAL_MODEL);
  return body;
}

describe("session router", () => {
  beforeEach(() => {
    installFakeBridge();
  });

  test("arranca en /session/new", () => {
    const router = createTestRouter();
    router.initialize();
    expect(router.state.location.pathname).toBe("/session/new");
  });

  test("redirige / a /session/new", async () => {
    const router = createTestRouter(["/"]);
    router.initialize();
    await waitFor(() => router.state.location.pathname === "/session/new");
    expect(router.state.navigation.state).toBe("idle");
  });

  test("el primer envío crea la sesión, redirige y guarda el eco", async () => {
    const router = createTestRouter();
    router.initialize();

    await router.navigate("/session/new", {
      formMethod: "post",
      formData: form("hola", "build"),
    });

    expect(router.state.location.pathname).toMatch(/^\/session\/(?!new$).+/);
    const session = loadedSession(router.state.loaderData.session);
    expect(session.turns).toEqual([
      expect.objectContaining({ role: "user", text: "hola", mode: "build" }),
      expect.objectContaining({
        role: "assistant",
        text: "hola",
        status: "done",
        model: LOCAL_MODEL,
      }),
    ]);
  });

  test("un mensaje error guarda el fallo sin salir de la sesión", async () => {
    const router = createTestRouter();
    router.initialize();
    await router.navigate("/session/new", {
      formMethod: "post",
      formData: form("error"),
    });

    const session = loadedSession(router.state.loaderData.session);
    expect(session.turns[1]).toEqual(
      expect.objectContaining({
        role: "assistant",
        status: "error",
        error: "No se pudo obtener la respuesta",
        model: LOCAL_MODEL,
      }),
    );
    expect(router.state.errors).toBeNull();
  });

  test("el siguiente envío usa la action de la sesión", async () => {
    const router = createTestRouter();
    router.initialize();
    await router.navigate("/session/new", {
      formMethod: "post",
      formData: form("uno"),
    });

    const id = loadedSession(router.state.loaderData.session).id;
    await router.fetch("chat-send", "session", `/session/${id}`, {
      formMethod: "post",
      formData: form("dos", "plan"),
    });

    expect(router.state.location.pathname).toBe(`/session/${id}`);
    await router.revalidate();
    const session = loadedSession(router.state.loaderData.session);
    expect(session.turns.map((turn) => turn.text)).toEqual(["uno", "uno", "dos", "dos"]);
    expect(session.turns.at(-1)).toEqual(
      expect.objectContaining({
        role: "assistant",
        status: "done",
        text: "dos",
        model: LOCAL_MODEL,
      }),
    );
  });

  test("el loader de un id desconocido responde 404", async () => {
    const router = createTestRouter();
    router.initialize();
    await router.navigate("/session/no-existe");

    const error = router.state.errors?.session;
    expect(isRouteErrorResponse(error)).toBe(true);
    if (isRouteErrorResponse(error)) {
      expect(error.status).toBe(404);
    }
  });

  test("al navegar a otra sesión carga el historial completo", async () => {
    const bridge = installFakeBridge();
    const created = await bridge.createSession();
    await bridge.sendMessage({
      chatSessionId: created.id,
      text: "primero",
      mode: "plan",
      model: LOCAL_MODEL,
    });
    await bridge.sendMessage({
      chatSessionId: created.id,
      text: "segundo",
      mode: "build",
      model: LOCAL_MODEL,
    });

    const other = await bridge.createSession();
    await bridge.sendMessage({
      chatSessionId: other.id,
      text: "otra",
      mode: "plan",
      model: LOCAL_MODEL,
    });

    const router = createTestRouter([`/session/${other.id}`]);
    router.initialize();
    await waitFor(() => router.state.navigation.state === "idle");

    await router.navigate(`/session/${created.id}`);
    const session = loadedSession(router.state.loaderData.session);
    expect(session.turns.map((t) => t.text)).toEqual([
      "primero",
      "primero",
      "segundo",
      "segundo",
    ]);
  });
});

function loadedSession(data: unknown): Session {
  if (!data || typeof data !== "object" || !("id" in data) || !("turns" in data)) {
    throw new Error("loader sin sesión");
  }
  return data as Session;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 1000) {
      throw new Error("timeout esperando al router");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
