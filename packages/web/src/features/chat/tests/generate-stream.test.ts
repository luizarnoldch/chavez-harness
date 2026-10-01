import { describe, expect, test } from "bun:test";
import {
  applyGenerateProgress,
  phaseLabel,
  upsertDraftTool,
  type GenerateStream,
} from "../live/generate-stream";

const SESSION = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

describe("upsertDraftTool", () => {
  test("agrega nuevos y fusiona por id", () => {
    let tools = upsertDraftTool([], { id: "t1", name: "read", status: "running", args: { path: "a" } });
    tools = upsertDraftTool(tools, { id: "t2", name: "grep", status: "running" });
    tools = upsertDraftTool(tools, { id: "t1", name: "read", status: "completed", result: "ok" });
    expect(tools).toHaveLength(2);
    expect(tools[0]).toEqual({
      id: "t1",
      name: "read",
      status: "completed",
      args: { path: "a" },
      result: "ok",
    });
    expect(tools[1]?.id).toBe("t2");
  });
});

describe("applyGenerateProgress", () => {
  test("acumula textDelta solo en streaming", () => {
    let stream: GenerateStream | null = null;
    stream = applyGenerateProgress(stream, { sessionId: SESSION, phase: "reasoning" }, SESSION);
    stream = applyGenerateProgress(
      stream,
      { sessionId: SESSION, phase: "streaming", textDelta: "Hola" },
      SESSION,
    );
    stream = applyGenerateProgress(
      stream,
      { sessionId: SESSION, phase: "streaming", textDelta: " mundo" },
      SESSION,
    );
    stream = applyGenerateProgress(
      stream,
      { sessionId: SESSION, phase: "reasoning", textDelta: "ignorado" },
      SESSION,
    );
    expect(stream).toEqual({
      sessionId: SESSION,
      phase: "reasoning",
      draftText: "Hola mundo",
      draftTools: [],
    });
  });

  test("tool calls en vivo se actualizan in situ", () => {
    let stream = applyGenerateProgress(
      null,
      {
        sessionId: SESSION,
        phase: "tool",
        toolCall: { id: "tc", name: "shell", status: "running", args: { command: "ls" } },
      },
      SESSION,
    );
    stream = applyGenerateProgress(
      stream,
      {
        sessionId: SESSION,
        phase: "tool",
        toolCall: { id: "tc", name: "shell", status: "completed", result: "a\nb" },
      },
      SESSION,
    );
    expect(stream?.draftTools).toEqual([
      { id: "tc", name: "shell", status: "completed", args: { command: "ls" }, result: "a\nb" },
    ]);
  });

  test("ignora progreso de otras sesiones del workspace", () => {
    const prev = applyGenerateProgress(
      null,
      { sessionId: SESSION, phase: "streaming", textDelta: "x" },
      SESSION,
    );
    const next = applyGenerateProgress(
      prev,
      { sessionId: OTHER, phase: "streaming", textDelta: "y" },
      SESSION,
    );
    expect(next).toBe(prev);
  });

  test("ignora pushes incompletos", () => {
    expect(applyGenerateProgress(null, { phase: "tool" }, SESSION)).toBeNull();
    expect(applyGenerateProgress(null, { sessionId: SESSION }, SESSION)).toBeNull();
  });
});

describe("phaseLabel", () => {
  test("etiquetas en español", () => {
    expect(phaseLabel("reasoning")).toBe("Razonando");
    expect(phaseLabel("streaming")).toBe("Escribiendo");
    expect(phaseLabel("tool")).toBe("Usando herramientas");
    expect(phaseLabel(null)).toBe("Esperando respuesta");
  });
});
