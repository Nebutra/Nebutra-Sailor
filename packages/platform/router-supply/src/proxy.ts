import type { RouterUpstreamTarget } from "@nebutra/prepaid-wallet";

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export interface ProxyChatInput {
  readonly targets: readonly RouterUpstreamTarget[];
  readonly body: Record<string, unknown>;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface ProxyChatResult {
  readonly response: Response;
  readonly target: RouterUpstreamTarget;
  readonly attempts: number;
}

/**
 * Stream-friendly chat completions proxy with engine fallback.
 * Does not buffer the full body — returns the winning Response as-is.
 */
export async function proxyChatCompletions(input: ProxyChatInput): Promise<ProxyChatResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let lastError: Error | undefined;
  let attempts = 0;

  for (const target of input.targets) {
    attempts += 1;
    const payload = {
      ...input.body,
      model: target.upstreamModel === "*" ? input.body.model : target.upstreamModel,
    };
    try {
      const response = await fetchImpl(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify(payload),
        ...(input.signal ? { signal: input.signal } : {}),
      });
      if (response.ok || !RETRYABLE.has(response.status)) {
        return { response, target, attempts };
      }
      // retry next target
      await response.arrayBuffer().catch(() => undefined);
      lastError = new Error(`Upstream ${target.engineId} status ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("All supply engines failed");
}
