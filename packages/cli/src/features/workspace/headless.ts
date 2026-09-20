import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function usage() {
  console.error(`Usage:
  bun run src/features/workspace/headless.ts workspace open <path>
  bun run src/features/workspace/headless.ts workspace host
`);
  process.exit(1);
}

async function workspaceOpen(pathArg: string) {
  const workspacePath = resolve(pathArg);
  const daemonEntry = fileURLToPath(new URL("./ws/daemon.ts", import.meta.url));

  const child = Bun.spawn(["bun", "run", daemonEntry, workspacePath], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "ignore",
    env: process.env,
  });

  console.error(`[headless] daemon started pid=${child.pid} path=${workspacePath}`);

  const code = await child.exited;
  process.exit(code);
}

async function workspaceHost() {
  const hostEntry = fileURLToPath(new URL("./ws/host.ts", import.meta.url));
  const child = Bun.spawn(["bun", "run", hostEntry], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "ignore",
    env: process.env,
  });

  console.error(`[headless] host started pid=${child.pid}`);

  const code = await child.exited;
  process.exit(code);
}

async function main() {
  if (args[0] !== "workspace") usage();
  if (args[1] === "open" && args[2]) {
    await workspaceOpen(args[2]!);
    return;
  }
  if (args[1] === "host") {
    await workspaceHost();
    return;
  }
  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
