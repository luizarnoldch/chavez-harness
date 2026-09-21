import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { SessionFooter } from "../chrome/SessionFooter";

describe("SessionFooter stream phase", () => {
  test("muestra razonando cuando phase es reasoning", async () => {
    const setup = await testRender(
      <SessionFooter
        busy
        model="auto"
        provider="cursor"
        mode="plan"
        streamPhase="reasoning"
      />,
      { width: 80, height: 4 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("razonando");
      expect(frame).toContain("solo lectura");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("muestra escribiendo cuando phase es streaming", async () => {
    const setup = await testRender(
      <SessionFooter
        busy
        model="auto"
        provider="cursor"
        mode="plan"
        streamPhase="streaming"
      />,
      { width: 80, height: 4 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      expect(setup.captureCharFrame()).toContain("escribiendo");
    } finally {
      setup.renderer.destroy();
    }
  });

  test("muestra hint completo en modo build", async () => {
    const setup = await testRender(
      <SessionFooter busy={false} model="auto" provider="cursor" mode="build" />,
      { width: 80, height: 4 },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });
      const frame = setup.captureCharFrame();
      expect(frame).toContain("completo");
      expect(frame).not.toContain("solo lectura");
    } finally {
      setup.renderer.destroy();
    }
  });
});
