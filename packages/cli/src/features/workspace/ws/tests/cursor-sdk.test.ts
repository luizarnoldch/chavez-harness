import { describe, expect, mock, test } from "bun:test";
import type { SDKAgent } from "@cursor/sdk";
import { CURSOR_PLAN_TOOLS } from "@chavez-harness/shared";
import type { Credentials } from "../../../auth/api/credentials.ts";
import {
  progressFromSdkMessage,
  resolveCursorModelId,
  runCursorSdkGenerate,
  textFromRunResult,
  toolsForChatMode,
  usageFromRunResult,
  type CursorAgentFactory,
} from "../cursor-sdk.ts";

describe("cursor-sdk helpers", () => {
  test("resolveCursorModelId defaults eco/local/empty to auto", () => {
    expect(resolveCursorModelId("")).toBe("auto");
    expect(resolveCursorModelId("eco")).toBe("auto");
    expect(resolveCursorModelId("local")).toBe("auto");
    expect(resolveCursorModelId("auto")).toBe("auto");
    expect(resolveCursorModelId("composer-2.5-fast")).toBe("composer-2.5-fast");
  });

  test("textFromRunResult returns result text", () => {
    expect(
      textFromRunResult({ status: "finished", result: "  hola  " }),
    ).toBe("hola");
  });

  test("textFromRunResult throws on error/empty/cancelled", () => {
    expect(() =>
      textFromRunResult({ status: "error", error: { message: "boom" } }),
    ).toThrow(/boom/);
    expect(() => textFromRunResult({ status: "cancelled" })).toThrow(/cancelled/);
    expect(() => textFromRunResult({ status: "finished", result: "  " })).toThrow(
      /empty/,
    );
  });

  test("usageFromRunResult maps tokens duration model and cost", () => {
    expect(
      usageFromRunResult(
        {
          usage: {
            inputTokens: 1,
            outputTokens: 2,
            cacheReadTokens: 3,
            cacheWriteTokens: 4,
            totalTokens: 10,
            reasoningTokens: 5,
          },
          durationMs: 1500,
          model: { id: "auto" },
        },
        { rawCostCents: 10, chargedCents: 8 },
      ),
    ).toEqual({
      inputTokens: 1,
      outputTokens: 2,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
      totalTokens: 10,
      reasoningTokens: 5,
      durationMs: 1500,
      cost: { rawCostCents: 10, chargedCents: 8 },
      resolvedModel: "auto",
    });
  });

  test("usageFromRunResult returns undefined when empty", () => {
    expect(usageFromRunResult({})).toBeUndefined();
  });

  test("toolsForChatMode is read-only allowlist for plan", () => {
    expect(toolsForChatMode("plan")).toEqual([...CURSOR_PLAN_TOOLS]);
    expect(toolsForChatMode("build")).toBeUndefined();
    expect(toolsForChatMode(undefined)).toBeUndefined();
  });

  test("progressFromSdkMessage maps thinking and assistant text", () => {
    expect(
      progressFromSdkMessage({
        type: "thinking",
        agent_id: "a",
        run_id: "r",
        text: "…",
      }),
    ).toEqual({ phase: "reasoning" });
    expect(
      progressFromSdkMessage({
        type: "assistant",
        agent_id: "a",
        run_id: "r",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "hola" }],
        },
      }),
    ).toEqual({ phase: "streaming", textDelta: "hola" });
  });
});

describe("runCursorSdkGenerate (mocked Agent)", () => {
  const credentials = {
    apiUrl: "http://localhost:9999",
    sessionToken: "tok",
  } as Credentials;

  function mockFetchUnwrap() {
    const original = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      Response.json({ apiKey: "sk-test" }),
    ) as unknown as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  }

  function makeAgent(
    agentId: string,
    reply: string,
    send?: SDKAgent["send"],
  ): SDKAgent {
    return {
      agentId,
      model: undefined,
      send:
        send ??
        (async () =>
          ({
            supports: () => false,
            wait: async () => ({ status: "finished", result: reply }),
          }) as never),
      close: () => {},
      reload: async () => {},
      [Symbol.asyncDispose]: async () => {},
      listArtifacts: async () => [],
      downloadArtifact: async () => Buffer.from(""),
      getUsage: async () => ({}) as never,
    };
  }

  test("first turn creates agent and returns agentId", async () => {
    const restore = mockFetchUnwrap();
    const send = mock(async () =>
      ({
        supports: () => false,
        wait: async () => ({ status: "finished", result: "respuesta 1" }),
      }) as never,
    );
    const create = mock(async () => makeAgent("agent-new", "respuesta 1", send));
    const resume = mock(async () => makeAgent("agent-resumed", "nope"));
    const factory: CursorAgentFactory = { create, resume };

    try {
      const outcome = await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "hola",
          workspacePath: "/tmp/ws",
        },
        factory,
      );
      expect(outcome).toEqual({ text: "respuesta 1", agentId: "agent-new" });
      expect(create).toHaveBeenCalledTimes(1);
      expect(resume).toHaveBeenCalledTimes(0);
      expect(send).toHaveBeenCalledWith("hola", { model: { id: "auto" } });
    } finally {
      restore();
    }
  });

  test("second turn resumes with agentId", async () => {
    const restore = mockFetchUnwrap();
    const send = mock(async () =>
      ({
        supports: () => false,
        wait: async () => ({ status: "finished", result: "respuesta 2" }),
      }) as never,
    );
    const create = mock(async () => makeAgent("agent-new", "create"));
    const resume = mock(async () => makeAgent("agent-prev", "respuesta 2", send));
    const factory: CursorAgentFactory = { create, resume };

    try {
      const outcome = await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "sigue",
          workspacePath: "/tmp/ws",
          agentId: "agent-prev",
        },
        factory,
      );
      expect(outcome).toEqual({ text: "respuesta 2", agentId: "agent-prev" });
      expect(resume).toHaveBeenCalledTimes(1);
      expect(resume).toHaveBeenCalledWith("agent-prev", {
        apiKey: "sk-test",
        model: { id: "auto" },
        local: { cwd: "/tmp/ws" },
      });
      expect(create).toHaveBeenCalledTimes(0);
      expect(send).toHaveBeenCalledWith("sigue", { model: { id: "auto" } });
    } finally {
      restore();
    }
  });

  test("plan mode passes read-only tools on create", async () => {
    const restore = mockFetchUnwrap();
    const create = mock(async () => makeAgent("agent-plan", "ok"));
    const resume = mock(async () => makeAgent("x", "nope"));
    const factory: CursorAgentFactory = { create, resume };

    try {
      await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "hola",
          workspacePath: "/tmp/ws",
          mode: "plan",
        },
        factory,
      );
      expect(create).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: { id: "auto" },
        local: { cwd: "/tmp/ws" },
        tools: [...CURSOR_PLAN_TOOLS],
      });
    } finally {
      restore();
    }
  });

  test("plan mode passes read-only tools on resume", async () => {
    const restore = mockFetchUnwrap();
    const send = mock(async () =>
      ({
        supports: () => false,
        wait: async () => ({ status: "finished", result: "ok" }),
      }) as never,
    );
    const create = mock(async () => makeAgent("agent-new", "create"));
    const resume = mock(async () => makeAgent("agent-prev", "ok", send));
    const factory: CursorAgentFactory = { create, resume };

    try {
      await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "sigue",
          workspacePath: "/tmp/ws",
          mode: "plan",
          agentId: "agent-prev",
        },
        factory,
      );
      expect(resume).toHaveBeenCalledWith("agent-prev", {
        apiKey: "sk-test",
        model: { id: "auto" },
        local: { cwd: "/tmp/ws" },
        tools: [...CURSOR_PLAN_TOOLS],
      });
      expect(create).toHaveBeenCalledTimes(0);
    } finally {
      restore();
    }
  });

  test("build mode omits tools on create", async () => {
    const restore = mockFetchUnwrap();
    const create = mock(async () => makeAgent("agent-build", "ok"));
    const resume = mock(async () => makeAgent("x", "nope"));
    const factory: CursorAgentFactory = { create, resume };

    try {
      await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "hola",
          workspacePath: "/tmp/ws",
          mode: "build",
        },
        factory,
      );
      expect(create).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: { id: "auto" },
        local: { cwd: "/tmp/ws" },
      });
    } finally {
      restore();
    }
  });

  test("streams progress from thinking and assistant events", async () => {
    const restore = mockFetchUnwrap();
    const phases: string[] = [];
    const send = mock(async () =>
      ({
        supports: (op: string) => op === "stream",
        stream: async function* () {
          yield {
            type: "thinking",
            agent_id: "a",
            run_id: "r",
            text: "...",
          };
          yield {
            type: "assistant",
            agent_id: "a",
            run_id: "r",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "hola " }],
            },
          };
          yield {
            type: "assistant",
            agent_id: "a",
            run_id: "r",
            message: {
              role: "assistant",
              content: [{ type: "text", text: "hola mundo" }],
            },
          };
        },
        wait: async () => ({ status: "finished", result: "hola mundo" }),
      }) as never,
    );
    const create = mock(async () => makeAgent("agent-stream", "hola mundo", send));
    const factory: CursorAgentFactory = {
      create,
      resume: mock(async () => makeAgent("x", "nope")),
    };

    try {
      const outcome = await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "hola",
          workspacePath: "/tmp/ws",
          onProgress: (p) => {
            phases.push(p.phase);
          },
        },
        factory,
      );
      expect(outcome.text).toBe("hola mundo");
      expect(phases).toEqual(["reasoning", "streaming", "streaming"]);
    } finally {
      restore();
    }
  });

  test("resume failure falls back to create", async () => {
    const restore = mockFetchUnwrap();
    const create = mock(async () => makeAgent("agent-fresh", "recuperado"));
    const resume = mock(async () => {
      throw new Error("agent not found");
    });
    const factory: CursorAgentFactory = { create, resume };

    try {
      const outcome = await runCursorSdkGenerate(
        {
          credentials,
          jobId: "11111111-1111-4111-8111-111111111111",
          unwrapToken: "unwrap",
          model: "auto",
          prompt: "hola",
          workspacePath: "/tmp/ws",
          agentId: "stale-id",
        },
        factory,
      );
      expect(outcome).toEqual({ text: "recuperado", agentId: "agent-fresh" });
      expect(resume).toHaveBeenCalledTimes(1);
      expect(resume).toHaveBeenCalledWith("stale-id", {
        apiKey: "sk-test",
        model: { id: "auto" },
        local: { cwd: "/tmp/ws" },
      });
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});

const LIVE_KEY = process.env.CURSOR_API_KEY?.trim();

describe.skipIf(!LIVE_KEY)("runCursorSdkGenerate live (CURSOR_API_KEY)", () => {
  test("create → send → resume → send with model auto", async () => {
    const { Agent } = await import("@cursor/sdk");
    const cwd = process.cwd();

    await using agent = await Agent.create({
      apiKey: LIVE_KEY!,
      model: { id: "auto" },
      local: { cwd },
    });

    const run1 = await agent.send(
      "Reply with exactly the word PONG and nothing else.",
      { model: { id: "auto" } },
    );
    const result1 = await run1.wait();
    const text1 = textFromRunResult(result1);
    expect(text1.length).toBeGreaterThan(0);
    expect(agent.agentId).toBeTruthy();

    await using resumed = await Agent.resume(agent.agentId, {
      apiKey: LIVE_KEY!,
      model: { id: "auto" },
      local: { cwd },
    });
    const run2 = await resumed.send(
      "Reply with exactly the word PONG2 and nothing else.",
      { model: { id: "auto" } },
    );
    const result2 = await run2.wait();
    const text2 = textFromRunResult(result2);
    expect(text2.length).toBeGreaterThan(0);
  }, 180_000);
});
