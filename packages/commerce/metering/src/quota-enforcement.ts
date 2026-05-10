import type { QuotaEnforcementInput, QuotaEnforcementResult } from "./types";

export function evaluateUsageLimit(input: QuotaEnforcementInput): QuotaEnforcementResult {
  const requested = input.requested ?? 0;
  const projected = input.used + requested;

  if (input.limit === -1) {
    return {
      allowed: true,
      meterId: input.meterId,
      used: input.used,
      requested,
      projected,
      limit: -1,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const remaining = Math.max(0, input.limit - input.used);
  const allowed = projected < input.limit;

  return {
    allowed,
    meterId: input.meterId,
    used: input.used,
    requested,
    projected,
    limit: input.limit,
    remaining,
    ...(allowed ? {} : { reason: `${input.meterId} limit exceeded (${projected}/${input.limit})` }),
  };
}
