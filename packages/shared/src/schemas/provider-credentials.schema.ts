import { z } from "zod";
import { CONNECTABLE_PROVIDERS } from "./providers.schema.ts";

export const connectableProviderSchema = z.enum(CONNECTABLE_PROVIDERS);
export type ConnectableProviderSchema = z.infer<typeof connectableProviderSchema>;

export const providerCredentialStatusSchema = z.object({
  provider: connectableProviderSchema,
  supported: z.boolean(),
  configured: z.boolean(),
  hint: z.string().nullable(),
});

export const providerCredentialsListSchema = z.object({
  providers: z.array(providerCredentialStatusSchema),
});

export const upsertProviderCredentialBodySchema = z.object({
  apiKey: z.string().min(1),
});

export const unwrapProviderJobBodySchema = z.object({
  jobId: z.string().uuid(),
  unwrapToken: z.string().min(1),
});

export const unwrapProviderJobResponseSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
});
