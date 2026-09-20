import z from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

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

const config = {
  nodeEnv: parseEnv.NODE_ENV,
  serverUrl: parseEnv.SERVER_URL,
  port: parseEnv.PORT,
  databaseUrl: parseEnv.DATABASE_URL,
  betterAuthSecret: parseEnv.BETTER_AUTH_SECRET,
  /** @deprecated Prefer webUrl for browser/auth base; kept for OpenAPI / internal refs. */
  betterAuthUrl: parseEnv.BETTER_AUTH_URL ?? parseEnv.WEB_URL ?? "http://localhost:4321",
  /** Astro web origin (CORS + better-auth baseURL + trustedOrigins). */
  webUrl: parseEnv.WEB_URL ?? "http://localhost:4321",
  /** Material for AES-GCM of provider API keys (falls back to BETTER_AUTH_SECRET). */
  credentialsEncryptionKey:
    parseEnv.CREDENTIALS_ENCRYPTION_KEY ?? parseEnv.BETTER_AUTH_SECRET,
  cursorApiKey: parseEnv.CURSOR_API_KEY,
  seedEmail: parseEnv.SEED_EMAIL ?? "admin@chavez.local",
  seedPassword: parseEnv.SEED_PASSWORD ?? "changeme",
  seedName: parseEnv.SEED_NAME ?? "Admin",
};

export default config;
