import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

const HealthResponseSchema = z
  .object({
    ok: z.literal(true).openapi({ example: true }),
  })
  .openapi("HealthResponse");

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

export function registerHealthRoutes(app: OpenAPIHono) {
  app.openapi(healthRoute, (c) => c.json({ ok: true as const }, 200));
}
