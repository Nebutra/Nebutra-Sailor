import { z } from "zod";

export interface ResolvedApiKey {
  id: string;
  organizationId: string;
  userId: string | null;
  scopes: string[];
  rateLimitRps: number;
  plan: string;
}

export interface GatewayConfig {
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
    del: (key: string) => Promise<unknown>;
  };
  queue: { enqueue: (job: unknown) => Promise<unknown> };
}

export interface UsageResult {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export const CompletionEventSchema = z.object({
  requestId: z.string(),
  apiKeyId: z.string().nullable(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  model: z.string(),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  latencyMs: z.number().int().min(0),
  status: z.enum(["success", "error", "rate_limited", "insufficient_credits"]),
  errorMessage: z.string().nullable().optional(),
});

export type CompletionEvent = z.infer<typeof CompletionEventSchema>;

/**
 * Hono context variables set by the gateway auth middleware.
 * Use with `OpenAPIHono<{ Variables: GatewayContextVars }>`.
 */
export interface GatewayContextVars {
  resolvedApiKey: ResolvedApiKey;
  gatewayRequestId: string;
}
