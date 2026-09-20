import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "../src/db/auth/auth-schema.ts";
import { userProviderCredential } from "../src/db/providers/schema.ts";
import db from "../src/lib/db.ts";
import { createProviderCredentialsService } from "../src/services/providers.ts";
import { createProviderJobStore } from "../src/services/provider-jobs.ts";

const TEST_EMAIL = `providers-${Date.now()}@test.local`;
const ENC_KEY = "test-credentials-encryption-key";

describe("provider credentials (db)", () => {
  let userId: string;

  beforeAll(async () => {
    const [row] = await db
      .insert(user)
      .values({
        name: "Provider Test",
        email: TEST_EMAIL,
        emailVerified: true,
      })
      .returning();
    userId = row!.id;
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
  });

  test("upsert encrypts, lists hint, decrypts, replace on second upsert", async () => {
    const providers = createProviderCredentialsService(db, ENC_KEY);
    const first = await providers.upsert(userId, "cursor", "key_one_abcdefgh");
    expect(first.configured).toBe(true);
    expect(first.hint).toBe("efgh");

    const status = await providers.listStatus(userId);
    const cursor = status.find((p) => p.provider === "cursor");
    expect(cursor?.configured).toBe(true);
    expect(cursor?.hint).toBe("efgh");
    expect(JSON.stringify(status)).not.toContain("key_one");

    expect(await providers.decrypt(userId, "cursor")).toBe("key_one_abcdefgh");

    const second = await providers.upsert(userId, "cursor", "key_two_ijklmnop");
    expect(second.hint).toBe("mnop");
    expect(await providers.decrypt(userId, "cursor")).toBe("key_two_ijklmnop");

    const [row] = await db
      .select()
      .from(userProviderCredential)
      .where(eq(userProviderCredential.userId, userId));
    expect(row?.ciphertext).not.toContain("key_two");
  });

  test("openai upsert rejected", async () => {
    const providers = createProviderCredentialsService(db, ENC_KEY);
    await expect(providers.upsert(userId, "openai", "sk-test")).rejects.toThrow(
      /no soportado/i,
    );
  });

  test("job store consume is one-shot", () => {
    const jobs = createProviderJobStore();
    const job = jobs.create(userId, "cursor");
    expect(jobs.consume(job.jobId, "bad")).toBeNull();
    expect(jobs.consume(job.jobId, job.unwrapToken)?.userId).toBe(userId);
    expect(jobs.consume(job.jobId, job.unwrapToken)).toBeNull();
  });
});
