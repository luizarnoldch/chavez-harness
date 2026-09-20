import "dotenv/config";
import { sql } from "drizzle-orm";
import db from "../../lib/db";

/**
 * Truncate auth tables for e2e isolation.
 * Entity tables (e.g. "task") are appended by nextjs-cypress-e2e when specs are generated.
 */
export async function resetDatabase() {
  await db.execute(
    sql`TRUNCATE TABLE "session", "account", "verification", "user" RESTART IDENTITY CASCADE`,
  );
}

async function main() {
  await resetDatabase();
  console.log("Database reset complete");
  process.exit(0);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
