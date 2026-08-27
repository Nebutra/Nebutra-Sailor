/**
 * Image / video generation modality — public surface.
 *
 * Mirrors the LLM fallback design (`fallback.ts`): an ordered provider chain,
 * filtered to providers whose `envKey` is present, with `mock` as the
 * guaranteed terminal so a result is always produced. Retryable failures
 * (429 / 5xx / network) rotate to the next provider via `isRetryableError`.
 */

import { logger } from "@nebutra/logger";
import { isRetryableError } from "../fallback";
import { mockGenerationProvider } from "./mock-provider";
import type {
  GenerationCallOptions,
  GenerationContext,
  GenerationModality,
  GenerationProvider,
  GenerationResult,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "./types";

const log = logger.child({ module: "agents/generation" });

// ── Registry ────────────────────────────────────────────────────────────────
// `mock` is registered last and always available. Real providers register
// ahead of it (additively) and win whenever their env key is present.

const _registry = new Map<string, GenerationProvider>();

export function registerGenerationProvider(provider: GenerationProvider): void {
  _registry.set(provider.name, provider);
}

/** Test helper — restores the registry to just the mock provider. */
export function _resetGenerationRegistry(): void {
  _registry.clear();
  _registry.set(mockGenerationProvider.name, mockGenerationProvider);
}

_resetGenerationRegistry();

function hasEnvKey(provider: GenerationProvider): boolean {
  if (provider.envKey === null) return true;
  return Boolean(globalThis.process?.env?.[provider.envKey]);
}

/** Provider names available for a modality, in resolved priority order. */
export function listGenerationProviders(
  modality: GenerationModality,
  options: GenerationCallOptions = {},
): string[] {
  const envChain = (globalThis.process?.env?.GENERATION_FALLBACK_CHAIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const preferred = options.chain ?? (envChain.length > 0 ? envChain : []);

  // Real providers first (explicit chain wins, then registry order), `mock`
  // is always demoted to the guaranteed terminal regardless of registry order.
  const mockName = mockGenerationProvider.name;
  const all = [...preferred, ..._registry.keys()];
  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const name of all) {
    if (seen.has(name) || name === mockName) continue;
    seen.add(name);
    const provider = _registry.get(name);
    if (!provider) continue;
    if (!provider.capabilities.includes(modality)) continue;
    if (!hasEnvKey(provider)) continue;
    resolved.push(name);
  }
  resolved.push(mockName);
  return resolved;
}

async function runChain(
  modality: GenerationModality,
  options: GenerationCallOptions,
  ctx: GenerationContext,
  invoke: (p: GenerationProvider) => Promise<GenerationResult>,
): Promise<GenerationResult> {
  const chain = listGenerationProviders(modality, options);
  let lastErr: unknown;
  for (const name of chain) {
    const provider = _registry.get(name);
    if (!provider) continue;
    try {
      const result = await invoke(provider);
      log.debug("generation succeeded", {
        provider: name,
        modality,
        tenantId: ctx.tenantId,
      });
      return result;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err);
      log.warn("generation provider failed", {
        provider: name,
        modality,
        retryable,
        tenantId: ctx.tenantId,
      });
      // Non-retryable from the terminal mock would be a real bug — surface it.
      if (!retryable && name !== mockGenerationProvider.name) continue;
      if (!retryable) throw err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("[@nebutra/agents] generation chain exhausted");
}

/**
 * Generate an image. Always resolves (falls back to the deterministic mock).
 */
export async function generateImage(
  req: ImageGenerationRequest,
  ctx: GenerationContext,
  options: GenerationCallOptions = {},
): Promise<GenerationResult> {
  return runChain("image", options, ctx, (p) => {
    if (!p.generateImage) {
      throw new Error(`[@nebutra/agents] provider "${p.name}" lacks image support`);
    }
    return p.generateImage(req, ctx);
  });
}

/**
 * Generate a video (or, in mock mode, a deterministic poster frame).
 */
export async function generateVideo(
  req: VideoGenerationRequest,
  ctx: GenerationContext,
  options: GenerationCallOptions = {},
): Promise<GenerationResult> {
  return runChain("video", options, ctx, (p) => {
    if (!p.generateVideo) {
      throw new Error(`[@nebutra/agents] provider "${p.name}" lacks video support`);
    }
    return p.generateVideo(req, ctx);
  });
}

export { mockGenerationProvider } from "./mock-provider";
export type {
  GenerationCallOptions,
  GenerationContext,
  GenerationModality,
  GenerationProvider,
  GenerationResult,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "./types";
