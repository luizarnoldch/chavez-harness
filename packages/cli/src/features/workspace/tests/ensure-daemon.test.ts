import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  clearDaemonLock,
  daemonLockPath,
  stopWorkspaceDaemon,
} from "../ws/ensure-daemon.ts";
import { machineIdForHost } from "../ws/ensure-host.ts";

describe("ensure-daemon", () => {
  const workspacePath = join(tmpdir(), `chavez-daemon-test-${Date.now()}`);

  afterEach(async () => {
    await stopWorkspaceDaemon(workspacePath);
    await clearDaemonLock(workspacePath);
  });

  test("stopWorkspaceDaemon returns stopped false without lock", async () => {
    const result = await stopWorkspaceDaemon(join(tmpdir(), "no-such-ws-xyz"));
    expect(result.stopped).toBe(false);
  });

  test("stopWorkspaceDaemon clears stale lock", async () => {
    const lock = daemonLockPath(workspacePath);
    await mkdir(dirname(lock), { recursive: true });
    await writeFile(lock, "999999999\n", { mode: 0o600 });
    const result = await stopWorkspaceDaemon(workspacePath);
    expect(result.stopped).toBe(true);
    await expect(Bun.file(lock).exists()).resolves.toBe(false);
  });
});

describe("ensure-host", () => {
  test("machineIdForHost is stable for process", () => {
    const a = machineIdForHost();
    const b = machineIdForHost();
    expect(a).toBe(b);
    expect(a.length).toBe(24);
  });
});
