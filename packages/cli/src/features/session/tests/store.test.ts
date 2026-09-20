import { beforeEach, describe, expect, test } from "bun:test";
import { LOCAL_MODEL } from "../model";
import {
  appendAssistantTurn,
  appendUserTurn,
  createSession,
  getSession,
  resetSessions,
  shortSessionId,
} from "../store";

describe("session store", () => {
  beforeEach(() => {
    resetSessions();
  });

  test("crea una sesión vacía y la recupera por id", () => {
    const session = createSession();

    expect(session.turns).toEqual([]);
    expect(getSession(session.id)).toBe(session);
    expect(shortSessionId(session.id)).toBe(session.id.slice(0, 8));
  });

  test("getSession devuelve undefined si el id no existe", () => {
    expect(getSession("missing")).toBeUndefined();
  });

  test("agrega turnos de usuario y asistente", () => {
    const session = createSession();
    appendUserTurn(session.id, { text: "hola", mode: "build" });
    appendAssistantTurn(session.id, { text: "hola", model: LOCAL_MODEL, status: "done" });

    expect(getSession(session.id)?.turns).toEqual([
      expect.objectContaining({ role: "user", text: "hola", mode: "build" }),
      expect.objectContaining({ role: "assistant", text: "hola", status: "done", model: LOCAL_MODEL }),
    ]);
  });

  test("resetSessions olvida las sesiones", () => {
    const session = createSession();
    resetSessions();
    expect(getSession(session.id)).toBeUndefined();
  });
});
