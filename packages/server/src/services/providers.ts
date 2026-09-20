import { and, eq } from "drizzle-orm";
import {
  CONNECTABLE_PROVIDERS,
  type ProviderCredentialStatus,
  type SupportedProvider,
} from "@chavez-harness/shared";
import { userProviderCredential } from "../db/providers/schema.ts";
import { decryptSecret, encryptSecret } from "../lib/crypto/provider-secrets.ts";
import type { Db } from "../lib/db.ts";

export class ProviderNotSupportedError extends Error {
  readonly status = 400;
  constructor(provider: string) {
    super(`Provider no soportado en esta entrega: ${provider}`);
    this.name = "ProviderNotSupportedError";
  }
}

export class ProviderCredentialMissingError extends Error {
  readonly status = 400;
  constructor(provider: string) {
    super(`No hay API key para ${provider}. Usa /connect o seed con CURSOR_API_KEY.`);
    this.name = "ProviderCredentialMissingError";
  }
}

export type ProviderCredentialsService = ReturnType<typeof createProviderCredentialsService>;

/**
 * User-scoped LLM provider API keys (encrypted at rest).
 *
 * Today only `cursor` is writable end-to-end (daemon runs `@cursor/sdk`).
 * Future: `openai` / `antropic` / `grok` will call AI SDK (`generateText`)
 * on the server with the same credential rows — no daemon required.
 */
export function createProviderCredentialsService(db: Db, encryptionKey: string) {
  return {
    async listStatus(userId: string): Promise<ProviderCredentialStatus[]> {
      const rows = await db
        .select()
        .from(userProviderCredential)
        .where(eq(userProviderCredential.userId, userId));
      const byProvider = new Map(rows.map((row) => [row.provider, row]));

      return CONNECTABLE_PROVIDERS.map((provider) => {
        const row = byProvider.get(provider);
        const supported = provider === "cursor";
        return {
          provider,
          supported,
          configured: Boolean(row),
          hint: row?.hint ?? null,
        };
      });
    },

    async upsert(userId: string, provider: SupportedProvider, apiKey: string): Promise<ProviderCredentialStatus> {
      if (provider !== "cursor") {
        throw new ProviderNotSupportedError(provider);
      }
      const trimmed = apiKey.trim();
      if (!trimmed) {
        throw new Error("API key vacía");
      }

      const encrypted = encryptSecret(trimmed, encryptionKey);
      const now = new Date();
      const [row] = await db
        .insert(userProviderCredential)
        .values({
          userId,
          provider,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          keyVersion: encrypted.keyVersion,
          hint: encrypted.hint,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [userProviderCredential.userId, userProviderCredential.provider],
          set: {
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            keyVersion: encrypted.keyVersion,
            hint: encrypted.hint,
            updatedAt: now,
          },
        })
        .returning();

      if (!row) {
        throw new Error("Failed to upsert provider credential");
      }

      return {
        provider,
        supported: true,
        configured: true,
        hint: row.hint,
      };
    },

    async isConfigured(userId: string, provider: SupportedProvider): Promise<boolean> {
      const [row] = await db
        .select({ id: userProviderCredential.id })
        .from(userProviderCredential)
        .where(
          and(
            eq(userProviderCredential.userId, userId),
            eq(userProviderCredential.provider, provider),
          ),
        )
        .limit(1);
      return Boolean(row);
    },

    async decrypt(userId: string, provider: SupportedProvider): Promise<string> {
      const [row] = await db
        .select()
        .from(userProviderCredential)
        .where(
          and(
            eq(userProviderCredential.userId, userId),
            eq(userProviderCredential.provider, provider),
          ),
        )
        .limit(1);

      if (!row) {
        throw new ProviderCredentialMissingError(provider);
      }

      return decryptSecret(
        { ciphertext: row.ciphertext, nonce: row.nonce },
        encryptionKey,
      );
    },
  };
}
