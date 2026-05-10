/**
 * LLM observability via Langfuse.
 *
 * - No-op when env vars are missing — the package works with zero config.
 * - Exposes `experimental_telemetry` settings ready to plug into Vercel AI SDK.
 * - Use `LangfuseExporter` from `langfuse-vercel` in your OTEL NodeSDK setup
 *   for full trace export (see README).
 */

import { logger } from "@nebutra/logger";
import { getAgentsEnv, isLangfuseConfigured } from "./env";

// `Langfuse` client is dynamically imported so the package starts up
// without telemetry deps when they are not used.
type LangfuseClient = {
  trace: (input: unknown) => unknown;
  flushAsync: () => Promise<void>;
  shutdownAsync: () => Promise<void>;
};

let _client: LangfuseClient | null | undefined;

/**
 * Returns a configured `Langfuse` client, or `null` when env is missing.
 *
 * Telemetry is OPTIONAL. If LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY are
 * not set, this returns null (no error). Callers must handle the null case.
 */
export async function initLangfuse(): Promise<LangfuseClient | null> {
  if (_client !== undefined) return _client;

  if (!isLangfuseConfigured()) {
    _client = null;
    return null;
  }

  try {
    const env = getAgentsEnv();
    const { Langfuse } = await import("langfuse");
    _client = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY!,
      secretKey: env.LANGFUSE_SECRET_KEY!,
      baseUrl: env.LANGFUSE_HOST,
    }) as unknown as LangfuseClient;
    logger.info("Langfuse telemetry enabled", { host: env.LANGFUSE_HOST });
    return _client;
  } catch (error) {
    logger.warn("Failed to initialise Langfuse — telemetry disabled", { error });
    _client = null;
    return null;
  }
}

/** Test helper — clears cached client so subsequent init() re-reads env. */
export function _resetLangfuseCache(): void {
  _client = undefined;
}

export interface TelemetryMetadata {
  tenantId?: string | undefined;
  userId?: string | undefined;
  sessionId?: string | undefined;
  agentId?: string | undefined;
  [key: string]: unknown;
}

/**
 * Build the `experimental_telemetry` option for AI SDK calls.
 * Returns `{ isEnabled: false }` (a safe no-op) when Langfuse is not configured,
 * which avoids any OTEL span creation cost.
 */
export function buildTelemetryConfig(args: { functionId: string; metadata?: TelemetryMetadata }): {
  isEnabled: boolean;
  functionId?: string;
  metadata?: Record<string, unknown>;
} {
  if (!isLangfuseConfigured()) {
    return { isEnabled: false };
  }

  return {
    isEnabled: true,
    functionId: args.functionId,
    metadata: {
      ...(args.metadata ?? {}),
      // Langfuse picks up these conventional keys from metadata
      ...(args.metadata?.tenantId ? { langfuseUserId: args.metadata.tenantId } : {}),
      ...(args.metadata?.sessionId ? { langfuseSessionId: args.metadata.sessionId } : {}),
    },
  };
}

/** Flush pending telemetry before process exit. Safe to call when disabled. */
export async function flushTelemetry(): Promise<void> {
  const client = await initLangfuse();
  if (!client) return;
  try {
    await client.flushAsync();
  } catch (error) {
    logger.warn("Langfuse flush failed", { error });
  }
}
