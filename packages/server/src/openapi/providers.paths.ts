import type { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  ErrorBodySchema,
  ProviderCredentialStatusSchema,
  ProviderCredentialsListSchema,
  ProviderPathParam,
  UnwrapProviderJobBodySchema,
  UnwrapProviderJobResponseSchema,
  UpsertProviderCredentialBodySchema,
} from "./schemas.ts";

/** Documentation-only paths for provider credentials (handlers in routes/providers.ts). */
export function registerProvidersOpenApiPaths(app: OpenAPIHono) {
  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/providers",
    tags: ["Providers"],
    summary: "List provider credential status",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Provider status list",
        content: {
          "application/json": { schema: ProviderCredentialsListSchema },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "put",
    path: "/api/providers/{provider}/credentials",
    tags: ["Providers"],
    summary: "Upsert provider API key",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ provider: ProviderPathParam }),
      body: {
        required: true,
        content: {
          "application/json": { schema: UpsertProviderCredentialBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "Updated credential status",
        content: {
          "application/json": { schema: ProviderCredentialStatusSchema },
        },
      },
      400: {
        description: "Unsupported provider or empty API key",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/provider-jobs/unwrap",
    tags: ["Providers"],
    summary: "Unwrap one-shot provider job credentials",
    description:
      "Consumes a jobId + unwrapToken issued for daemon chat generation and returns the decrypted API key. One-shot; invalid or expired jobs return 404.",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: UnwrapProviderJobBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "Provider + API key",
        content: {
          "application/json": { schema: UnwrapProviderJobResponseSchema },
        },
      },
      400: {
        description: "Missing credentials for provider",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
      404: {
        description: "Invalid or expired job",
        content: { "application/json": { schema: ErrorBodySchema } },
      },
    },
  });
}
