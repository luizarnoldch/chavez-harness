import { beforeEach, describe, expect, test } from "bun:test";
import { createElement } from "react";
import { createMemoryRouter, isRouteErrorResponse, type RouteObject } from "react-router";
import {
  newSessionAction,
  newSessionLoader,
  rootLoader,
  sessionAction,
  sessionLoader,
} from "../handlers";
import { resetMockReply, resolveMockReply, setMockReply } from "../mock-reply";
import { LOCAL_MODEL } from "../model";
import { resetSessions, type Session } from "../store";

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
    resetSessions();
    resetMockReply();
    setMockReply(async (text) => resolveMockReply(text));
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
      expect.objectContaining({ role: "assistant", text: "hola", status: "done", model: LOCAL_MODEL }),
    ]);
  });

  test("muestra navegación pendiente mientras llega la respuesta", async () => {
    const deferred = deferredReply();
    setMockReply(deferred.reply);

    const router = createTestRouter();
    router.initialize();
    const pending = router.navigate("/session/new", {
      formMethod: "post",
      formData: form("hola"),
    });

    await deferred.ready;
    expect(router.state.navigation.state).toBe("submitting");
    expect(router.state.navigation.formData?.get("text")).toBe("hola");

    deferred.release("hola");
    await pending;
    expect(router.state.navigation.state).toBe("idle");
    expect(router.state.location.pathname).toMatch(/^\/session\/(?!new$).+/);
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
    const deferred = deferredReply();
    setMockReply(deferred.reply);

    const pending = router.fetch("chat-send", "session", `/session/${id}`, {
      formMethod: "post",
      formData: form("dos", "plan"),
    });

    await deferred.ready;
    expect(router.state.fetchers.get("chat-send")?.state).toBe("submitting");
    expect(router.state.location.pathname).toBe(`/session/${id}`);

    deferred.release("dos");
    await pending;

    expect(router.state.location.pathname).toBe(`/session/${id}`);
    const session = loadedSession(router.state.loaderData.session);
    expect(session.turns.map((turn) => turn.text)).toEqual(["uno", "uno", "dos", "dos"]);
    expect(session.turns.at(-1)).toEqual(
      expect.objectContaining({ role: "assistant", status: "done", text: "dos", model: LOCAL_MODEL }),
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
});

function loadedSession(data: unknown): Session {
  if (!data || typeof data !== "object" || !("id" in data) || !("turns" in data)) {
    throw new Error("loader sin sesión");
  }
  return data as Session;
}

function deferredReply() {
  let release: (text: string) => void = () => {};
  let markReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  return {
    ready,
    release: (text: string) => release(text),
    reply: (text: string) =>
      new Promise<string>((resolve) => {
        release = resolve;
        markReady();
        void text;
      }),
  };
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
