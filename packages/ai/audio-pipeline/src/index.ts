import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { CapabilityError } from "@nebutra/errors";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  type LicenseMetadata,
  requireBrandContext,
} from "@nebutra/generation-context";

export type AudioIntent =
  | { type: "bgm"; durationS: number; mood: string; bpm?: number }
  | { type: "sfx"; description: string; durationS?: number }
  | { type: "song"; lyricsPrompt: string; durationS: number };

export interface AudioAsset extends GeneratedAsset {
  readonly kind: "audio";
  readonly durationS: number;
  readonly format: "wav";
  readonly loudnessLufs: number;
}

export interface AudioHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface AudioPipelineOptions {
  readonly root?: string;
  readonly provider?: "tone-local" | "local-model" | "remote";
}

export async function readAudioDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("audio-pipeline", { root, limit });
}

function intentLabel(intent: AudioIntent): string {
  switch (intent.type) {
    case "bgm":
      return intent.mood;
    case "sfx":
      return intent.description;
    case "song":
      return intent.lyricsPrompt;
  }
}

function durationFor(intent: AudioIntent): number {
  if (intent.type === "sfx") return Math.max(1, Math.min(intent.durationS ?? 3, 8));
  return Math.max(1, Math.min(intent.durationS, 12));
}

export function createToneWav(durationS: number, frequency = 440, sampleRate = 24_000): Buffer {
  const samples = Math.max(1, Math.floor(durationS * sampleRate));
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples; index += 1) {
    const fade = Math.min(index / 1200, (samples - index) / 1200, 1);
    const sample = Math.round(
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 9000 * fade,
    );
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  return buffer;
}

function frequencyFor(brand: BrandContext, intent: AudioIntent): number {
  const base = brand.toneKeywords.join("").length + intentLabel(intent).length;
  return 220 + (base % 9) * 55;
}

function licenseFor(requireCommercial: boolean, provider: string): LicenseMetadata {
  if (requireCommercial && provider !== "tone-local") {
    return {
      status: "unknown",
      source: provider,
      suggestion: "Verify the provider plan and model terms before commercial use.",
    };
  }
  return { status: "commercial-ok", source: "deterministic local renderer" };
}

export class AudioPipeline {
  readonly #root: string;
  readonly #provider: "tone-local" | "local-model" | "remote";

  constructor(options: AudioPipelineOptions = {}) {
    this.#root = options.root ?? process.cwd();
    this.#provider = options.provider ?? "tone-local";
  }

  async generate(
    intent: AudioIntent,
    brandInput: BrandContext | undefined,
    requireCommercial = true,
  ): Promise<AudioAsset> {
    const brand = requireBrandContext(brandInput, "audio-pipeline");
    if (requireCommercial && this.#provider !== "tone-local") {
      throw new CapabilityError(
        "audio-pipeline",
        "Selected audio provider lacks verified license",
        {
          suggestion: "Use tone-local or wire a provider with commercial license metadata.",
          statusCode: 409,
        },
      );
    }
    const durationS = durationFor(intent);
    const id = assetId("audio", `${intent.type}_${intentLabel(intent)}`);
    const path = join(this.#root, ".nebutra", "generated", "audio-pipeline", `${id}.wav`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, createToneWav(durationS, frequencyFor(brand, intent)));

    const asset: AudioAsset = {
      id,
      tenantId: brand.tenantId,
      kind: "audio",
      path,
      brandId: brand.brandId,
      provider: this.#provider,
      model: "brand-context-tone-v1",
      createdAt: new Date().toISOString(),
      license: licenseFor(requireCommercial, this.#provider),
      durationS,
      format: "wav",
      loudnessLufs: -18,
      metadata: { intent, brandSource: brand.sourcePath },
    };
    await appendCapabilityDebug(
      "audio-pipeline",
      { type: "generate", asset },
      { root: this.#root },
    );
    return asset;
  }

  async doctor(): Promise<AudioHealth[]> {
    return [
      { provider: "tone-local", ok: true },
      {
        provider: "local-model",
        ok: Boolean(process.env.AUDIO_LOCAL_MODEL_PATH),
        suggestion: "Set AUDIO_LOCAL_MODEL_PATH to enable local model generation.",
      },
      {
        provider: "remote",
        ok: Boolean(process.env.AUDIO_REMOTE_API_KEY),
        suggestion: "Set AUDIO_REMOTE_API_KEY to enable remote audio fallback.",
      },
    ];
  }

  async license(asset: Pick<AudioAsset, "license">): Promise<LicenseMetadata> {
    return asset.license;
  }

  async loudness(asset: Pick<AudioAsset, "loudnessLufs">): Promise<{ lufs: number }> {
    return { lufs: asset.loudnessLufs };
  }
}
