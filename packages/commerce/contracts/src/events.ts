import { z } from "zod";

export const EventContextSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  traceId: z.string().min(1).optional(),
  occurredAt: z.coerce.date(),
  contractVersion: z.literal("v1").default("v1"),
});
export type EventContext = z.infer<typeof EventContextSchema>;

export const EventEnvelopeSchema = z.object({
  eventName: z.string().min(1),
  context: EventContextSchema,
  payload: z.record(z.string(), z.unknown()),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
