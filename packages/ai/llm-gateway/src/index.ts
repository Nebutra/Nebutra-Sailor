import { CapabilityError } from "@nebutra/errors";
import {
  appendDebug,
  type LLMProvider,
  type ProviderCompletion,
  type ProviderMessage,
  ProviderRegistry,
} from "@nebutra/provider-registry";

export interface GatewayRequest {
  readonly capability: string;
  readonly budgetUsd?: number;
  readonly messages: readonly ProviderMessage[];
  readonly cacheKey?: string;
  readonly maxFallbacks?: number;
}

export interface GatewayDecision {
  readonly provider: string;
  readonly reason: string;
  readonly fallbackIndex: number;
}

export interface GatewayDebugEntry {
  readonly requestId: string;
  readonly decision: GatewayDecision;
  readonly ok: boolean;
  readonly error?: string;
}

export interface GatewayUsageReport {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly estimatedUsd: number;
}

export interface LlmGatewayOptions {
  readonly providers?: readonly LLMProvider[];
  readonly registry?: ProviderRegistry;
}

interface CacheEntry {
  readonly response: ProviderCompletion;
}

function capabilityParts(capability: string): string[] {
  return capability
    .split(/[+,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function prefixCacheKey(request: GatewayRequest): string {
  return (
    request.cacheKey ??
    JSON.stringify({
      capability: request.capability,
      prefix: request.messages.slice(0, Math.max(1, request.messages.length - 1)),
      last: request.messages.at(-1),
    })
  );
}

export class LlmGateway {
  readonly #registry: ProviderRegistry;
  readonly #cache = new Map<string, CacheEntry>();
  readonly #debug: GatewayDebugEntry[] = [];
  #hits = 0;
  #misses = 0;
  #usage: GatewayUsageReport = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedUsd: 0,
  };

  constructor(options: LlmGatewayOptions = {}) {
    this.#registry =
      options.registry ??
      new ProviderRegistry(
        options.providers && options.providers.length > 0
          ? options.providers
          : ProviderRegistry.default().list(),
      );
  }

  static default(): LlmGateway {
    return new LlmGateway();
  }

  async complete(request: GatewayRequest): Promise<ProviderCompletion> {
    const requestId = `gw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const cacheKey = prefixCacheKey(request);
    const cached = this.#cache.get(cacheKey);
    if (cached) {
      this.#hits += 1;
      return cached.response;
    }
    this.#misses += 1;

    const providers = this.route(request);
    let lastError: unknown;
    const max = request.maxFallbacks ?? providers.length;

    for (let index = 0; index < Math.min(max, providers.length); index += 1) {
      const provider = providers[index];
      if (!provider) continue;
      const decision: GatewayDecision = {
        provider: provider.id,
        fallbackIndex: index,
        reason: `matched capability "${request.capability}"`,
      };
      try {
        const response = await provider.complete(request.messages);
        this.#recordUsage(response);
        this.#cache.set(cacheKey, { response });
        const entry = { requestId, decision, ok: true };
        this.#debug.push(entry);
        await appendDebug("llm-gateway", { type: "complete", ...entry });
        return response;
      } catch (error) {
        lastError = error;
        const entry = {
          requestId,
          decision,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
        this.#debug.push(entry);
        await appendDebug("llm-gateway", { type: "fallback", ...entry });
      }
    }

    throw new CapabilityError("llm-gateway", "All routed providers failed", {
      suggestion: "Run `pnpm gateway:doctor` and inspect `pnpm gateway:debug <call_id>`.",
      metadata: { capability: request.capability, lastError: String(lastError) },
    });
  }

  route(request: GatewayRequest): LLMProvider[] {
    const parts = capabilityParts(request.capability);
    const all = this.#registry.list();
    const matched = all.filter((provider) =>
      parts.every((part) => provider.capabilities.has(part)),
    );
    return matched.length > 0 ? matched : all;
  }

  cacheStats(): { hits: number; misses: number; size: number } {
    return { hits: this.#hits, misses: this.#misses, size: this.#cache.size };
  }

  usageReport(): GatewayUsageReport {
    return { ...this.#usage };
  }

  debugLog(): readonly GatewayDebugEntry[] {
    return [...this.#debug];
  }

  #recordUsage(response: ProviderCompletion): void {
    const inputTokens = response.usage?.inputTokens ?? 0;
    const outputTokens = response.usage?.outputTokens ?? 0;
    const totalTokens = response.usage?.totalTokens ?? inputTokens + outputTokens;
    this.#usage = {
      calls: this.#usage.calls + 1,
      inputTokens: this.#usage.inputTokens + inputTokens,
      outputTokens: this.#usage.outputTokens + outputTokens,
      totalTokens: this.#usage.totalTokens + totalTokens,
      estimatedUsd: Number((this.#usage.estimatedUsd + totalTokens * 0.000_001).toFixed(6)),
    };
  }
}
