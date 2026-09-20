import z from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
});

const parseEnv = envSchema.parse(process.env);

const config = {
  nodeEnv: parseEnv.NODE_ENV,
  nextPublicAppUrl: parseEnv.NEXT_PUBLIC_APP_URL,
};

export default config;
