import {
  upsertProviderCredentialBodySchema,
  unwrapProviderJobBodySchema,
  connectableProviderSchema,
} from "@chavez-harness/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, type AuthVariables } from "../lib/auth/http.ts";
import {
  ProviderCredentialMissingError,
  ProviderNotSupportedError,
  type ProviderCredentialsService,
} from "../services/providers.ts";
import type { ProviderJobStore } from "../services/provider-jobs.ts";

export type ProviderApiOptions = {
  providers: ProviderCredentialsService;
  jobs: ProviderJobStore;
};

export function createProviderRoutes(options: ProviderApiOptions) {
  const { providers, jobs } = options;
  const app = new Hono<{ Variables: AuthVariables }>();

  app.use("/api/providers/*", requireAuth);
  app.use("/api/providers", requireAuth);
  app.use("/api/provider-jobs/*", requireAuth);

  app.get("/api/providers", async (c) => {
    const user = c.get("user");
    const list = await providers.listStatus(user.id);
    return c.json({ providers: list });
  });

  app.put(
    "/api/providers/:provider/credentials",
    zValidator("param", z.object({ provider: connectableProviderSchema })),
    zValidator("json", upsertProviderCredentialBodySchema),
    async (c) => {
      const { provider } = c.req.valid("param");
      const { apiKey } = c.req.valid("json");
      const user = c.get("user");
      try {
        const status = await providers.upsert(user.id, provider, apiKey);
        return c.json(status);
      } catch (err) {
        if (err instanceof ProviderNotSupportedError) {
          return c.json({ error: err.message }, 400);
        }
        if (err instanceof Error && err.message === "API key vacía") {
          return c.json({ error: err.message }, 400);
        }
        throw err;
      }
    },
  );

  /** One-shot unwrap for daemon chat jobs (authenticated as the same user). */
  app.post(
    "/api/provider-jobs/unwrap",
    zValidator("json", unwrapProviderJobBodySchema),
    async (c) => {
      const { jobId, unwrapToken } = c.req.valid("json");
      const user = c.get("user");
      const job = jobs.consume(jobId, unwrapToken);
      if (!job || job.userId !== user.id) {
        return c.json({ error: "Job inválido o expirado" }, 404);
      }
      try {
        const apiKey = await providers.decrypt(
          user.id,
          job.provider as "cursor",
        );
        return c.json({ provider: job.provider, apiKey });
      } catch (err) {
        if (err instanceof ProviderCredentialMissingError) {
          return c.json({ error: err.message }, 400);
        }
        throw err;
      }
    },
  );

  return app;
}
