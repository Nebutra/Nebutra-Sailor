/**
 * BYOK upstream resolver for the AI gateway.
 *
 * Injected as `createAiGatewayRoutes(deps, { resolveUpstreams })`. It PREFERS the
 * tenant's own provider key (decrypted server-side via the repository seam) and
 * falls back to the platform env upstreams:
 *
 *   - tenant key present + alwaysUse → tenant upstream only (no platform fallback)
 *   - tenant key present             → tenant upstream first, env upstreams as tail
 *   - no tenant key / unknown model  → platform env upstreams (default behaviour)
 *
 * The plaintext key never leaves the gateway. Any resolution failure degrades to
 * the platform key, so a bad BYOK row can never take down inference.
 */

import type { AIProvider } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { getTenantProviderKeyRepository } from "@nebutra/repositories";
import {
  type AiGatewayResolveInput,
  type AiGatewayUpstream,
  defaultEnvUpstreams,
} from "./gateway.js";

/** Default OpenAI-compatible base URL per provider (env-overridable). */
function providerBaseUrl(provider: AIProvider): string | null {
  switch (provider) {
    case "OPENAI":
      return process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    case "ANTHROPIC":
      return process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
    case "GOOGLE":
      return (
        process.env.GOOGLE_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai"
      );
    case "SILICONFLOW":
      return process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1";
    default:
      // CUSTOM has no canonical endpoint — the tenant must supply a baseUrl.
      return null;
  }
}

/** Map a model id to the AIProvider that serves it. null = unknown → no BYOK. */
export function providerForModel(model: string): AIProvider | null {
  const m = model.toLowerCase();
  if (/^(gpt-|o1|o3|o4|chatgpt|text-|davinci|babbage)/.test(m)) return "OPENAI";
  if (m.startsWith("claude")) return "ANTHROPIC";
  if (m.startsWith("gemini")) return "GOOGLE";
  if (/deepseek|qwen|glm|yi-|internlm|siliconflow/.test(m)) return "SILICONFLOW";
  return null;
}

export function createByokResolveUpstreams() {
  return async (input: AiGatewayResolveInput): Promise<readonly AiGatewayUpstream[]> => {
    const fallback = defaultEnvUpstreams();
    const orgId = input.apiKey.organizationId;
    const provider = providerForModel(input.body.model);

    if (!orgId || !provider) return fallback;

    try {
      const resolved = await getTenantProviderKeyRepository(orgId).resolveForProvider(provider);
      if (!resolved) return fallback;

      const baseUrl = resolved.baseUrl ?? providerBaseUrl(provider);
      if (!baseUrl) return fallback; // CUSTOM without a baseUrl — cannot route.

      const tenantUpstream: AiGatewayUpstream = {
        id: `byok-${provider.toLowerCase()}-${orgId}`,
        provider: provider.toLowerCase(),
        baseUrl,
        apiKey: resolved.apiKey,
      };

      // "Always use this key": pin to the tenant upstream, no platform fallback.
      return resolved.alwaysUse ? [tenantUpstream] : [tenantUpstream, ...fallback];
    } catch (err) {
      logger.warn("[byok] Failed to resolve tenant provider key; using platform upstreams", {
        orgId,
        provider,
        error: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  };
}
