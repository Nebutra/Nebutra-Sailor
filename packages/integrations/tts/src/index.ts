/**
 * @nebutra/tts — provider-agnostic narration synthesis.
 *
 * The video-pipeline gap (the absorbed source had none). Mirrors Sailor's
 * established provider pattern: a deterministic zero-config mock is the
 * active default; real adapters (ElevenLabs/OpenAI/Volces) are selected via
 * the shared `@nebutra/provider-factory` and fail loud until landed (stub
 * lifecycle — activate when a real caller arrives). Multi-tenant by request
 * (`tenantId` is mandatory); persistence is the caller's (`@nebutra/uploads`).
 */

import { CapabilityError } from "@nebutra/capability-kit";
import { envPresent, resolveProviderType } from "@nebutra/provider-factory";

export class TtsError extends CapabilityError {
  constructor(message: string, init: { code: string; suggestion: string; cause?: unknown }) {
    super(message, init, {
      name: "TtsError",
      emptySuggestionFallback:
        "No suggestion was provided. This is a bug in @nebutra/tts — report it.",
    });
  }
}

export type TtsProviderType = "mock" | "elevenlabs" | "openai" | "volces";

export interface SynthesizeRequest {
  readonly text: string;
  /** Owning tenant — mandatory; never inferred. */
  readonly tenantId: string;
  readonly voice?: string;
}

export interface SynthesizedAudio {
  readonly uri: string;
  readonly durationSec: number;
  readonly provider: TtsProviderType;
}

export interface TtsProvider {
  readonly name: TtsProviderType;
  synthesize(req: SynthesizeRequest): Promise<SynthesizedAudio>;
  health(): Promise<{ ok: boolean; detail: string }>;
}

function assertText(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new TtsError("Cannot synthesize empty text.", {
      code: "TTS_EMPTY_TEXT",
      suggestion: "Pass a non-empty narration string.",
    });
  }
}

/** ~150 spoken words/min ≈ 2.5 words/s; deterministic estimate. */
function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 2.5) * 10) / 10);
}

/** Stable non-crypto hash for deterministic mock output. */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Zero-config deterministic default — real audio-free, but non-mock-typed. */
export class MockTtsProvider implements TtsProvider {
  readonly name = "mock" as const;

  async synthesize(req: SynthesizeRequest): Promise<SynthesizedAudio> {
    assertText(req.text);
    const tag = hash(`${req.tenantId}:${req.voice ?? "default"}:${req.text}`);
    return {
      uri: `data:audio/x-nebutra-mock;base64,${Buffer.from(tag).toString("base64")}`,
      durationSec: estimateDurationSec(req.text),
      provider: "mock",
    };
  }

  async health(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: "mock tts: deterministic, zero-config" };
  }
}

export function resolveTtsProvider(explicit?: TtsProviderType): TtsProviderType {
  return resolveProviderType<TtsProviderType>({
    explicit,
    envVarName: "TTS_PROVIDER",
    detectors: [
      { provider: "elevenlabs", when: envPresent("ELEVENLABS_API_KEY") },
      { provider: "openai", when: envPresent("OPENAI_API_KEY") },
      { provider: "volces", when: envPresent("VOLCES_TTS_TOKEN") },
    ],
    fallback: "mock",
  });
}

export interface TtsConfig {
  readonly provider?: TtsProviderType;
}

/** Resolve a TTS provider. Zero-config → mock; real adapters fail loud. */
export async function getTts(config?: TtsConfig): Promise<TtsProvider> {
  const type = resolveTtsProvider(config?.provider);
  if (type === "mock") return new MockTtsProvider();
  throw new TtsError(`The "${type}" TTS provider is not implemented yet.`, {
    code: "TTS_PROVIDER_UNIMPLEMENTED",
    suggestion:
      `Implement the ${type} adapter (synthesize + health) and register it ` +
      `here, or unset its env var to use the zero-config mock provider.`,
  });
}
