import z from "zod"

export const toolCallArgsSchema = z.record(z.string(), z.json());

export const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text-delta'),
    id: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal('reasoning-delta'),
    id: z.string(),
    result: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    args: toolCallArgsSchema,
  }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    result: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    messageId: z.string(),
    durationMs: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    messageId: z.string(),
    error: z.string(),
  })
]);

export const chatStreamEventsSchema = z.array(chatStreamEventSchema);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
