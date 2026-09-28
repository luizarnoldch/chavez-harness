import z from "zod";
import {
  dedupeOrigins,
  isAllowedWebOrigin as checkAllowedWebOrigin,
  parseTrustedOriginsCsv,
  type AllowedWebOriginOptions,
} from "./web-origin";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

const boolFromEnv = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(lower)) return true;
    if (["0", "false", "no", "off"].includes(lower)) return false;
  }
  return value;
}, z.boolean().optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SERVER_URL: z.string().url().default("http://localhost:28001"),
  PORT: z.coerce.number().int().positive().default(28001),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@127.0.0.1:28000/app"),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  WEB_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  TRUSTED_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
  ALLOW_PRIVATE_NETWORK_ORIGINS: boolFromEnv,
  CREDENTIALS_ENCRYPTION_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  CURSOR_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SEED_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().optional(),
  ),
  SEED_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SEED_NAME: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

const parseEnv = envSchema.parse(process.env);

const webUrl = parseEnv.WEB_URL ?? "http://localhost:4321";
const trustedOrigins = dedupeOrigins([
  webUrl,
  ...parseTrustedOriginsCsv(parseEnv.TRUSTED_ORIGINS),
]);
const allowPrivateNetworkOrigins =
  parseEnv.ALLOW_PRIVATE_NETWORK_ORIGINS ?? webUrl.startsWith("http:");

const config = {
  nodeEnv: parseEnv.NODE_ENV,
  serverUrl: parseEnv.SERVER_URL,
  port: parseEnv.PORT,
  databaseUrl: parseEnv.DATABASE_URL,
  betterAuthSecret: parseEnv.BETTER_AUTH_SECRET,
  /** @deprecated Prefer webUrl for browser/auth base; kept for OpenAPI / internal refs. */
  betterAuthUrl: parseEnv.BETTER_AUTH_URL ?? parseEnv.WEB_URL ?? "http://localhost:4321",
  /** Astro web origin (CORS + better-auth baseURL + trustedOrigins). */
  webUrl,
  /** Static allowlist: WEB_URL + TRUSTED_ORIGINS. */
  trustedOrigins,
  /**
   * When true, also accept HTTP Origins on private/link-local hosts whose port
   * matches WEB_URL (LAN phone/tablet access). Default: true if WEB_URL is http.
   */
  allowPrivateNetworkOrigins,
  /** Material for AES-GCM of provider API keys (falls back to BETTER_AUTH_SECRET). */
  credentialsEncryptionKey:
    parseEnv.CREDENTIALS_ENCRYPTION_KEY ?? parseEnv.BETTER_AUTH_SECRET,
  cursorApiKey: parseEnv.CURSOR_API_KEY,
  seedEmail: parseEnv.SEED_EMAIL ?? "admin@chavez.local",
  seedPassword: parseEnv.SEED_PASSWORD ?? "changeme",
  seedName: parseEnv.SEED_NAME ?? "Admin",
};

const allowedOriginOptions = (): AllowedWebOriginOptions => ({
  trustedOrigins: config.trustedOrigins,
  webUrl: config.webUrl,
  allowPrivateNetworkOrigins: config.allowPrivateNetworkOrigins,
});

/** CORS / better-auth Origin check against current config. */
export function isAllowedWebOrigin(origin: string | undefined): boolean {
  return checkAllowedWebOrigin(origin, allowedOriginOptions());
}

export default config;
