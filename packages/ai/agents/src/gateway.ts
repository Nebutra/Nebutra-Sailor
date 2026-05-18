import { isRetryableError } from "./fallback";

export type AgentRuntimeGatewayMessageRole = "system" | "user" | "assistant" | "tool";

export interface AgentRuntimeGatewayMessage {
  readonly role: AgentRuntimeGatewayMessageRole;
  readonly content: string;
}

export interface AgentRuntimeGatewayUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface AgentRuntimeGatewayCompletion {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly text: string;
  readonly usage?: AgentRuntimeGatewayUsage;
  readonly raw?: unknown;
}

export interface AgentRuntimeGatewayProvider {
  readonly id: string;
  readonly model: string;
  readonly capabilities: ReadonlySet<string>;
  complete(
    messages: readonly AgentRuntimeGatewayMessage[],
    options?: AgentRuntimeGatewayCompleteOptions,
  ): Promise<AgentRuntimeGatewayCompletion>;
}

export interface AgentRuntimeGatewayCompleteOptions {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
}

export interface AgentRuntimeGatewayRequest extends AgentRuntimeGatewayCompleteOptions {
  readonly capability: string;
  readonly messages: readonly AgentRuntimeGatewayMessage[];
  readonly tenantId?: string;
  readonly userId?: string;
  readonly requestId?: string;
  readonly cacheKey?: string;
  readonly maxFallbacks?: number;
}

export interface AgentRuntimeGatewayDecision {
  readonly provider: string;
  readonly reason: string;
  readonly fallbackIndex: number;
}

export interface AgentRuntimeGatewayDebugEntry {
  readonly requestId: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly decision: AgentRuntimeGatewayDecision;
  readonly ok: boolean;
  readonly error?: string;
}

export interface AgentRuntimeGatewayUsageReport {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly estimatedUsd: number;
}

export interface AgentRuntimeGatewayOptions {
  readonly providers: readonly AgentRuntimeGatewayProvider[];
  readonly estimateUsd?: (usage: Required<AgentRuntimeGatewayUsage>) => number;
  readonly requestId?: () => string;
}

interface CacheEntry {
  readonly response: AgentRuntimeGatewayCompletion;
}

function capabilityParts(capability: string): string[] {
  return capability
    .split(/[+,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cacheKey(request: AgentRuntimeGatewayRequest): string {
  return (
    request.cacheKey ??
    JSON.stringify({
      capability: request.capability,
      prefix: request.messages.slice(0, Math.max(1, request.messages.length - 1)),
      last: request.messages.at(-1),
    })
  );
}

function normalizeUsage(
  usage: AgentRuntimeGatewayUsage | undefined,
): Required<AgentRuntimeGatewayUsage> {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.totalTokens ?? inputTokens + outputTokens,
  };
}

function defaultRequestId(): string {
  return `agents-gw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultCostEstimate(usage: Required<AgentRuntimeGatewayUsage>): number {
  return usage.totalTokens * 0.000_001;
}

export class AgentRuntimeGateway {
  readonly #providers: readonly AgentRuntimeGatewayProvider[];
  readonly #cache = new Map<string, CacheEntry>();
  readonly #debug: AgentRuntimeGatewayDebugEntry[] = [];
  readonly #estimateUsd: (usage: Required<AgentRuntimeGatewayUsage>) => number;
  readonly #requestId: () => string;
  #hits = 0;
  #misses = 0;
  #usage: AgentRuntimeGatewayUsageReport = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedUsd: 0,
  };

  constructor(options: AgentRuntimeGatewayOptions) {
    this.#providers = options.providers;
    this.#estimateUsd = options.estimateUsd ?? defaultCostEstimate;
    this.#requestId = options.requestId ?? defaultRequestId;
  }

  async complete(request: AgentRuntimeGatewayRequest): Promise<AgentRuntimeGatewayCompletion> {
    const resolvedRequestId = request.requestId ?? this.#requestId();
    const resolvedCacheKey = cacheKey(request);
    const cached = this.#cache.get(resolvedCacheKey);
    if (cached) {
      this.#hits += 1;
      return cached.response;
    }
    this.#misses += 1;

    const providers = this.route(request);
    let lastError: unknown;
    const max = Math.min(request.maxFallbacks ?? providers.length, providers.length);

    for (let index = 0; index < max; index += 1) {
      const provider = providers[index];
      if (!provider) continue;

      const decision: AgentRuntimeGatewayDecision = {
        provider: provider.id,
        fallbackIndex: index,
        reason: `matched capability "${request.capability}"`,
      };

      try {
        const response = await provider.complete(request.messages, {
          ...(request.temperature !== undefined && { temperature: request.temperature }),
          ...(request.maxTokens !== undefined && { maxTokens: request.maxTokens }),
          ...(request.signal !== undefined && { signal: request.signal }),
        });
        this.#recordUsage(response);
        this.#cache.set(resolvedCacheKey, { response });
        this.#debug.push({
          requestId: resolvedRequestId,
          ...(request.tenantId !== undefined && { tenantId: request.tenantId }),
          ...(request.userId !== undefined && { userId: request.userId }),
          decision,
          ok: true,
        });
        return response;
      } catch (error) {
        lastError = error;
        this.#debug.push({
          requestId: resolvedRequestId,
          ...(request.tenantId !== undefined && { tenantId: request.tenantId }),
          ...(request.userId !== undefined && { userId: request.userId }),
          decision,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!isRetryableError(error)) throw error;
      }
    }

    throw new Error(
      `All AgentRuntimeGateway providers failed for capability "${request.capability}". Last error: ${String(lastError)}`,
    );
  }

  route(request: Pick<AgentRuntimeGatewayRequest, "capability">): AgentRuntimeGatewayProvider[] {
    const parts = capabilityParts(request.capability);
    const matched = this.#providers.filter((provider) =>
      parts.every((part) => provider.capabilities.has(part)),
    );
    return matched.length > 0 ? matched : [...this.#providers];
  }

  cacheStats(): { hits: number; misses: number; size: number } {
    return { hits: this.#hits, misses: this.#misses, size: this.#cache.size };
  }

  usageReport(): AgentRuntimeGatewayUsageReport {
    return { ...this.#usage };
  }

  debugLog(): readonly AgentRuntimeGatewayDebugEntry[] {
    return [...this.#debug];
  }

  #recordUsage(response: AgentRuntimeGatewayCompletion): void {
    const usage = normalizeUsage(response.usage);
    this.#usage = {
      calls: this.#usage.calls + 1,
      inputTokens: this.#usage.inputTokens + usage.inputTokens,
      outputTokens: this.#usage.outputTokens + usage.outputTokens,
      totalTokens: this.#usage.totalTokens + usage.totalTokens,
      estimatedUsd: Number((this.#usage.estimatedUsd + this.#estimateUsd(usage)).toFixed(6)),
    };
  }
}
