import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { hostname as osHostname, homedir } from "node:os";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

function hostLockPath(): string {
  return join(homedir(), ".config", "chavez", "host.pid");
}

export function machineIdForHost(): string {
  const raw = `${osHostname()}:${homedir()}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

async function isPidAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a single Host process is running (detached). Returns existing PID if alive.
 */
export async function ensureHost(): Promise<{ spawned: boolean; pid: number | null }> {
  const lockPath = hostLockPath();
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

  const hostEntry = fileURLToPath(new URL("./host.ts", import.meta.url));
  const child = Bun.spawn(["bun", "run", hostEntry], {
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
    env: process.env,
  });

  if (!child.pid) {
    throw new Error("No se pudo arrancar el Host");
  }

  await writeFile(lockPath, `${child.pid}\n`, { mode: 0o600 });
  return { spawned: true, pid: child.pid };
}

export async function clearHostLock(): Promise<void> {
  try {
    await unlink(hostLockPath());
  } catch {
    // ignore
  }
}

export { hostLockPath };
