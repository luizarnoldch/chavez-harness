import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { sql } from "drizzle-orm";
import db from "../../lib/db.ts";

/**
 * Destructive reset for local/dev: truncate app tables then re-seed.
 * Run: bun run db:reset
 */
async function main() {
  await db.execute(sql`
    TRUNCATE TABLE
      "chat_message",
      "chat_session",
      "workspace",
      "user_provider_credential",
      "session",
      "account",
      "verification",
      "user"
    RESTART IDENTITY CASCADE
  `);
  console.log("[reset] truncated tables");

  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  const seedPath = join(scriptsDir, "seed.ts");
  const child = spawn("bun", ["run", seedPath], {
    stdio: "inherit",
    env: process.env,
  });

  const code: number = await new Promise((resolve) => {
    child.on("exit", (c) => resolve(c ?? 1));
  });
  process.exit(code);
}

main().catch((err) => {
  console.error("[reset] failed", err);
  process.exit(1);
});
