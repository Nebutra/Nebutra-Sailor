/**
 * @nebutra/ai-providers — provider metadata, meta-only.
 *
 * Runtime AI calls (generateText, streamText, embed, createModel, etc.)
 * live in `@nebutra/agents`. This package exposes **data only**:
 *
 *   - PROVIDERS: the full registry of supported providers
 *   - PROVIDERS_BY_CATEGORY, getProvider(), isCNCompatible()
 *   - ProviderMeta, ProviderStatus, ProviderCategory types
 *   - templates/registry.ts.template — consumed by @nebutra/create-sailor
 *
 * Consumers:
 *   - @nebutra/create-sailor — scaffolds per-app registry.ts from templates
 *   - Documentation generators
 *   - Admin UIs that display which providers are supported
 *
 * @example
 * ```ts
 * import { PROVIDERS, getProvider } from "@nebutra/ai-providers";
 *
 * const anthropic = getProvider("anthropic");
 * // → { id: "anthropic", envVarPrefix: "ANTHROPIC", requiredEnvVars: ["ANTHROPIC_API_KEY"], ... }
 * ```
 */

export {
  getProvider,
  isCNCompatible,
  PROVIDERS,
  PROVIDERS_BY_CATEGORY,
  type ProviderCategory,
  type ProviderMeta,
  type ProviderStatus,
} from "./meta.js";
