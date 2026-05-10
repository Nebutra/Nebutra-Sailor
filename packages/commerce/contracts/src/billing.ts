import { z } from "zod";

export const UsageTypeContractSchema = z.enum([
  "API_CALL",
  "AI_TOKEN",
  "STORAGE",
  "COMPUTE",
  "BANDWIDTH",
  "CUSTOM",
]);
export type UsageTypeContract = z.infer<typeof UsageTypeContractSchema>;

export const UsageLedgerSourceContractSchema = z.enum([
  "API",
  "WORKFLOW",
  "WEBHOOK",
  "SYSTEM",
  "BACKFILL",
]);
export type UsageLedgerSourceContract = z.infer<typeof UsageLedgerSourceContractSchema>;

export const UsageLedgerEntryInputSchema = z.object({
  organizationId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  eventId: z.string().min(1).optional(),
  subscriptionId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  source: UsageLedgerSourceContractSchema.default("API"),
  type: UsageTypeContractSchema,
  resource: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).default("unit"),
  unitCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  occurredAt: z.coerce.date(),
  ingestVersion: z.string().min(1).default("v1"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type UsageLedgerEntryInput = z.infer<typeof UsageLedgerEntryInputSchema>;

export const PricingCatalogVersionSchema = z.object({
  planSlug: z.string().min(1),
  version: z.string().min(1),
  effectiveFrom: z.coerce.date(),
});
export type PricingCatalogVersion = z.infer<typeof PricingCatalogVersionSchema>;
