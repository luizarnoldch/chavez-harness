import { describe, expect, test } from "bun:test";
import {
  basename,
  formatAgo,
  formatCents,
  formatDuration,
  formatTokens,
  prettyPath,
} from "../format";
import { resolveTheme } from "../theme";

describe("format", () => {
  test("basename / prettyPath", () => {
    expect(basename("/home/me/proj/")).toBe("proj");
    expect(basename("C:\\work\\repo")).toBe("repo");
    expect(prettyPath("/home/me/Work/repo")).toBe("~/Work/repo");
    expect(prettyPath("/srv/repo")).toBe("/srv/repo");
  });

  test("formatTokens", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(12_340)).toBe("12.3k");
    expect(formatTokens(2_000)).toBe("2k");
    expect(formatTokens(2_500_000)).toBe("2.5M");
  });

  test("formatDuration", () => {
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(12_300)).toBe("12.3 s");
    expect(formatDuration(65_000)).toBe("1 min 5 s");
    expect(formatDuration(120_000)).toBe("2 min");
  });

  test("formatCents", () => {
    expect(formatCents(0)).toBe("$0");
    expect(formatCents(0.12)).toBe("$0.0012");
    expect(formatCents(12.5)).toBe("$0.125");
    expect(formatCents(250)).toBe("$2.50");
  });

  test("formatAgo", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(formatAgo("2026-09-30T11:59:50Z", now)).toBe("ahora");
    expect(formatAgo("2026-09-30T11:55:00Z", now)).toBe("hace 5 min");
    expect(formatAgo("2026-09-30T09:00:00Z", now)).toBe("hace 3 h");
    expect(formatAgo("2026-09-28T12:00:00Z", now)).toBe("hace 2 d");
    expect(formatAgo(null, now)).toBe("—");
  });
});

describe("resolveTheme", () => {
  test("la elección explícita gana; si no, el sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});
