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

import { providerBaseUrl, providerForModel } from "@nebutra/ai-providers/catalog";
import { logger } from "@nebutra/logger";
import { getTenantProviderKeyRepository, isSafeUpstreamBaseUrl } from "@nebutra/repositories";
import {
  type AiGatewayResolveInput,
  type AiGatewayUpstream,
  defaultEnvUpstreams,
} from "./gateway.js";

export function createByokResolveUpstreams() {
  return async (input: AiGatewayResolveInput): Promise<readonly AiGatewayUpstream[]> => {
    const fallback = defaultEnvUpstreams();
    const orgId = input.apiKey.organizationId;
    // Model→provider comes from the models.dev-backed catalog (single source),
    // not a hand-maintained regex. null = unknown → platform default.
    const provider = await providerForModel(input.body.model);

    if (!orgId || !provider) return fallback;

    try {
      const resolved = await getTenantProviderKeyRepository(orgId).resolveForProvider(provider);
      if (!resolved) return fallback;

      const baseUrl = resolved.baseUrl ?? providerBaseUrl(provider);
      if (!baseUrl) return fallback; // CUSTOM without a baseUrl — cannot route.

      // SSRF guard: a tenant-supplied baseUrl must be a public https endpoint —
      // never the gateway's private network / cloud metadata. Reject → platform.
      if (resolved.baseUrl && !isSafeUpstreamBaseUrl(resolved.baseUrl)) {
        logger.warn("[byok] Rejected tenant baseUrl (non-public/non-https); using platform", {
          orgId,
          provider,
        });
        return fallback;
      }

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
