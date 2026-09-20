import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function usage() {
  console.error(`Usage:
  bun run src/commands/headless.ts workspace open <path>
`);
  process.exit(1);
}

async function workspaceOpen(pathArg: string) {
  const workspacePath = resolve(pathArg);
  const daemonEntry = fileURLToPath(new URL("../ws/daemon.ts", import.meta.url));

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

async function main() {
  if (args[0] !== "workspace" || args[1] !== "open" || !args[2]) {
    usage();
  }
  await workspaceOpen(args[2]!);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
