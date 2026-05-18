import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createToneWav } from "@nebutra/audio-pipeline";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  requireBrandContext,
} from "@nebutra/generation-context";

export type VoiceState = "listening" | "thinking" | "speaking" | "paused" | "closed";

export interface VoiceSession {
  readonly id: string;
  readonly tenantId: string;
  readonly threadId: string;
  readonly room: string;
  readonly state: VoiceState;
}

export interface NarrationRequest {
  readonly script: string;
  readonly voiceProfileId?: string;
  readonly targetDurationS?: number;
}

export interface VoiceAsset extends GeneratedAsset {
  readonly kind: "voice";
  readonly transcript: string;
  readonly durationS: number;
  readonly format: "wav";
  readonly voiceProfileId: string;
}

export interface VoiceProfile {
  readonly id: string;
  readonly tenantId: string;
  readonly consentRecordedAt: string;
  readonly sampleCount: number;
}

export interface VoiceHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface VoiceRealtimeOptions {
  readonly root?: string;
}

export async function readVoiceDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("voice-realtime", { root, limit });
}

export class VoiceRealtime {
  readonly #root: string;

  constructor(options: VoiceRealtimeOptions = {}) {
    this.#root = options.root ?? process.cwd();
  }

  async startSession(input: { tenantId: string; threadId: string }): Promise<VoiceSession> {
    const session: VoiceSession = {
      id: assetId("voice_session", input.threadId),
      tenantId: input.tenantId,
      threadId: input.threadId,
      room: `voice_${input.tenantId}_${input.threadId}`,
      state: "listening",
    };
    await appendCapabilityDebug(
      "voice-realtime",
      { type: "session", session },
      { root: this.#root },
    );
    return session;
  }

  async synthesizeNarration(
    request: NarrationRequest,
    brandInput: BrandContext | undefined,
  ): Promise<VoiceAsset> {
    const brand = requireBrandContext(brandInput, "voice-realtime");
    const durationS = Math.max(
      1,
      Math.min(request.targetDurationS ?? Math.ceil(request.script.length / 24), 20),
    );
    const id = assetId("voice", `${brand.brandId}_${request.script}`);
    const path = join(this.#root, ".nebutra", "generated", "voice-realtime", `${id}.wav`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, createToneWav(durationS, 330));
    const asset: VoiceAsset = {
      id,
      tenantId: brand.tenantId,
      kind: "voice",
      path,
      brandId: brand.brandId,
      provider: "tone-local",
      model: "brand-context-narration-v1",
      createdAt: new Date().toISOString(),
      license: { status: "commercial-ok", source: "deterministic local renderer" },
      transcript: request.script,
      durationS,
      format: "wav",
      voiceProfileId: request.voiceProfileId ?? "default",
      metadata: { brandSource: brand.sourcePath },
    };
    await appendCapabilityDebug(
      "voice-realtime",
      { type: "narration", asset },
      { root: this.#root },
    );
    return asset;
  }

  async enroll(input: {
    tenantId: string;
    samplePaths?: readonly string[];
  }): Promise<VoiceProfile> {
    const profile: VoiceProfile = {
      id: assetId("voice_profile", input.tenantId),
      tenantId: input.tenantId,
      consentRecordedAt: new Date().toISOString(),
      sampleCount: input.samplePaths?.length ?? 0,
    };
    await appendCapabilityDebug(
      "voice-realtime",
      { type: "enroll", profile },
      { root: this.#root },
    );
    return profile;
  }

  async testMic(): Promise<VoiceHealth> {
    return {
      provider: "local-mic",
      ok: Boolean(process.env.VOICE_MIC_PERMISSION === "granted"),
      suggestion: "Grant microphone access in the desktop app before realtime sessions.",
    };
  }

  async doctor(): Promise<VoiceHealth[]> {
    return [
      await this.testMic(),
      {
        provider: "voice-sidecar",
        ok: Boolean(process.env.VOICE_SIDECAR_URL),
        suggestion: "Set VOICE_SIDECAR_URL to enable realtime WebRTC/STT/TTS.",
      },
      {
        provider: "remote-tts",
        ok: Boolean(process.env.VOICE_REMOTE_API_KEY),
        suggestion: "Set VOICE_REMOTE_API_KEY to enable remote voice fallback.",
      },
    ];
  }
}
