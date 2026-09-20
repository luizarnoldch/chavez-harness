import z from "zod";
import { toolCallArgsSchema } from "./tools.schema";

export const messagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('reasoning'),
    text: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    args: toolCallArgsSchema,
    result: z.string().optional(),
  }),
  z.object({
    type: z.literal("text"),
    text: z.string(),
  })
]);

export const messagePartsSchema = z.array(messagePartSchema);

export type messagePartSchema = z.infer<typeof messagePartSchema>;
