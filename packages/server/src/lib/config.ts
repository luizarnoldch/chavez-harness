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
});

const parseEnv = envSchema.parse(process.env);

const config = {
  nodeEnv: parseEnv.NODE_ENV,
  serverUrl: parseEnv.SERVER_URL,
  port: parseEnv.PORT,
  databaseUrl: parseEnv.DATABASE_URL,
  betterAuthSecret: parseEnv.BETTER_AUTH_SECRET,
  betterAuthUrl: parseEnv.BETTER_AUTH_URL ?? parseEnv.SERVER_URL,
};

export default config;
