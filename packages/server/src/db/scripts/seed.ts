import "dotenv/config";
import { eq } from "drizzle-orm";
import { account, user } from "../auth/auth-schema.ts";
import config from "../../lib/config.ts";
import db from "../../lib/db.ts";
import { hashPassword } from "../../lib/auth/email-password/password.ts";
import { createProviderCredentialsService } from "../../services/providers.ts";

async function ensureSeedUser(): Promise<string> {
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, config.seedEmail))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(user)
    .values({
      name: config.seedName,
      email: config.seedEmail,
      emailVerified: true,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create seed user");
  }

  const passwordHash = await hashPassword(config.seedPassword);
  await db.insert(account).values({
    accountId: created.email,
    providerId: "credential",
    userId: created.id,
    password: passwordHash,
  });

  console.log(`[seed] user ${config.seedEmail} / ${config.seedPassword}`);
  return created.id;
}

async function main() {
  const userId = await ensureSeedUser();
  const providers = createProviderCredentialsService(
    db,
    config.credentialsEncryptionKey,
  );

  if (config.cursorApiKey) {
    const status = await providers.upsert(userId, "cursor", config.cursorApiKey);
    console.log(`[seed] cursor credential configured (hint=…${status.hint})`);
  } else {
    console.log("[seed] CURSOR_API_KEY not set — skip cursor credential");
  }

  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
