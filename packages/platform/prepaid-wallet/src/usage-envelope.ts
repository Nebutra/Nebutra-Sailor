import { z } from "zod";

/**
 * Dual-ledger usage event: customer charge is product truth;
 * supply cost is optional engine/upstream cost for margin reconciliation.
 */
export const MoneyAmountSchema = z.object({
  amount: z.number().finite(),
  currency: z.string().min(1).max(8).default("USD"),
  unit: z.string().min(1).optional(),
});

export const UsageEnvelopeSchema = z.object({
  requestId: z.string().min(1),
  tenantId: z.string().min(1),
  apiKeyId: z.string().nullable(),
  product: z.enum(["router", "forge"]),
  meterId: z.string().min(1),
  /** What we charge the customer (Nebutra ledger truth). */
  customerCharge: MoneyAmountSchema,
  /** Optional upstream / engine cost basis. */
  supplyCost: MoneyAmountSchema.optional(),
  quantity: z.number().finite().nonnegative(),
  status: z.enum(["success", "error", "insufficient_credits", "rate_limited"]),
  createdAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
export type UsageEnvelope = z.infer<typeof UsageEnvelopeSchema>;

export function createUsageEnvelope(
  input: Omit<UsageEnvelope, "createdAt"> & { createdAt?: string },
): UsageEnvelope {
  const envelope: UsageEnvelope = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  return UsageEnvelopeSchema.parse(envelope);
}

export function parseUsageEnvelope(raw: unknown): UsageEnvelope {
  return UsageEnvelopeSchema.parse(raw);
}
