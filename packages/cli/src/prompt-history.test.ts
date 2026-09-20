import { describe, expect, test } from "bun:test";
import {
  createPromptHistory,
  pushEntry,
  recallNext,
  recallPrevious,
} from "./prompt-history";

describe("prompt history", () => {
  test("up from an empty input recalls the previous entry", () => {
    const history = pushEntry(pushEntry(createPromptHistory(), "primero"), "segundo");

    const recall = recallPrevious(history, "");

    expect(recall).not.toBeNull();
    expect(recall?.text).toBe("segundo");
    expect(recall?.cursor).toBe("start");
    expect(recall?.history.index).toBe(1);
  });

  test("down at the newest entry returns the empty draft", () => {
    const history = pushEntry(createPromptHistory(), "hola");
    const previous = recallPrevious(history, "");
    expect(previous).not.toBeNull();

    const next = recallNext(previous!.history, previous!.text);

    expect(next).not.toBeNull();
    expect(next?.text).toBe("");
    expect(next?.cursor).toBe("end");
    expect(next?.history.index).toBeNull();
  });

  test("down does nothing when the input is already empty", () => {
    const history = pushEntry(createPromptHistory(), "hola");

    expect(recallNext(history, "")).toBeNull();
  });
});
