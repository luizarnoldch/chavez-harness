import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function daemonLockPath(workspacePath: string): string {
  const hash = createHash("sha256").update(workspacePath).digest("hex").slice(0, 16);
  return join(homedir(), ".config", "chavez", "daemons", `${hash}.pid`);
}

async function isPidAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWorkspaceDaemon(workspacePath: string): Promise<{
  spawned: boolean;
  pid: number | null;
}> {
  const absolute = resolve(workspacePath);
  const lockPath = daemonLockPath(absolute);
  await mkdir(dirname(lockPath), { recursive: true });

  try {
    const raw = await readFile(lockPath, "utf8");
    const pid = Number(raw.trim());
    if (Number.isFinite(pid) && (await isPidAlive(pid))) {
      return { spawned: false, pid };
    }
  } catch {
    // no lock
  }

  const daemonEntry = fileURLToPath(new URL("./daemon.ts", import.meta.url));
  const child = Bun.spawn(["bun", "run", daemonEntry, absolute], {
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
    env: process.env,
  });

  if (!child.pid) {
    throw new Error("No se pudo arrancar el daemon");
  }

  await writeFile(lockPath, `${child.pid}\n`, { mode: 0o600 });
  return { spawned: true, pid: child.pid };
}

export async function stopWorkspaceDaemon(workspacePath: string): Promise<{
  stopped: boolean;
}> {
  const absolute = resolve(workspacePath);
  const lockPath = daemonLockPath(absolute);
  let pid: number | null = null;
  try {
    const raw = await readFile(lockPath, "utf8");
    pid = Number(raw.trim());
  } catch {
    return { stopped: false };
  }

  if (Number.isFinite(pid) && pid != null) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
  }

  await clearDaemonLock(absolute);
  return { stopped: true };
}

export async function clearDaemonLock(workspacePath: string): Promise<void> {
  try {
    await unlink(daemonLockPath(resolve(workspacePath)));
  } catch {
    // ignore
  }
}
