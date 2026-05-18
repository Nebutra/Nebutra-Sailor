import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  requireBrandContext,
  summarizeBrandContext,
} from "@nebutra/generation-context";

export type VideoIntent =
  | { type: "brand-film"; durationS: number; theme: string }
  | { type: "turntable"; durationS: number; subject: string }
  | { type: "clip"; durationS: number; prompt: string };

export interface StoryboardScene {
  readonly id: string;
  readonly durationS: number;
  readonly prompt: string;
  readonly transition: "cut" | "fade" | "match";
  readonly musicCue?: string;
  readonly voiceCue?: string;
}

export interface Storyboard {
  readonly id: string;
  readonly tenantId: string;
  readonly brandId: string;
  readonly intent: VideoIntent;
  readonly scenes: readonly StoryboardScene[];
  readonly totalDurationS: number;
}

export interface VideoAsset extends GeneratedAsset {
  readonly kind: "video";
  readonly durationS: number;
  readonly format: "manifest-json" | "mp4";
  readonly storyboardId: string;
}

export interface SyncedVideoOutput {
  readonly videoTrack: readonly VideoAsset[];
  readonly audioTrack?: readonly GeneratedAsset[];
  readonly voiceTrack?: readonly GeneratedAsset[];
  readonly captionTrack?: readonly { startS: number; endS: number; text: string }[];
}

export interface VideoHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface VideoPipelineOptions {
  readonly root?: string;
}

function debugPath(root = process.cwd()): string {
  return join(root, ".nebutra", "debug", "video-pipeline.jsonl");
}

async function appendDebug(root: string, entry: Record<string, unknown>): Promise<void> {
  const path = debugPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readVideoDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  try {
    const raw = await readFile(debugPath(root), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

function sceneCount(durationS: number): number {
  return Math.max(1, Math.min(8, Math.ceil(durationS / 8)));
}

export class VideoPipeline {
  readonly #root: string;

  constructor(options: VideoPipelineOptions = {}) {
    this.#root = options.root ?? process.cwd();
  }

  async plan(intent: VideoIntent, brandInput: BrandContext | undefined): Promise<Storyboard> {
    const brand = requireBrandContext(brandInput, "video-pipeline");
    const count = sceneCount(intent.durationS);
    const baseDuration = Math.max(1, Math.floor(intent.durationS / count));
    const scenes = Array.from({ length: count }, (_, index): StoryboardScene => {
      const sceneNumber = index + 1;
      return {
        id: `scene_${sceneNumber}`,
        durationS: index === count - 1 ? intent.durationS - baseDuration * index : baseDuration,
        prompt: `${brand.name} ${intent.type} scene ${sceneNumber}: ${summarizeBrandContext(brand)}`,
        transition: index === 0 ? "cut" : "fade",
        musicCue: brand.toneKeywords.join(", "),
        voiceCue: sceneNumber === 1 ? "introduce the product promise" : "advance the story",
      };
    });
    return {
      id: assetId("storyboard", `${intent.type}_${brand.brandId}`),
      tenantId: brand.tenantId,
      brandId: brand.brandId,
      intent,
      scenes,
      totalDurationS: scenes.reduce((sum, scene) => sum + scene.durationS, 0),
    };
  }

  async render(storyboard: Storyboard, brandInput: BrandContext | undefined): Promise<VideoAsset> {
    const brand = requireBrandContext(brandInput, "video-pipeline");
    const id = assetId("video", storyboard.id);
    const path = join(this.#root, ".nebutra", "generated", "video-pipeline", `${id}.video.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `${JSON.stringify({ storyboard, brand: summarizeBrandContext(brand), renderer: "manifest-local" }, null, 2)}\n`,
      "utf8",
    );
    const asset: VideoAsset = {
      id,
      tenantId: brand.tenantId,
      kind: "video",
      path,
      brandId: brand.brandId,
      provider: "manifest-local",
      model: "storyboard-manifest-v1",
      createdAt: new Date().toISOString(),
      license: { status: "commercial-ok", source: "deterministic local manifest" },
      durationS: storyboard.totalDurationS,
      format: "manifest-json",
      storyboardId: storyboard.id,
      metadata: { scenes: storyboard.scenes.length },
    };
    await appendDebug(this.#root, { type: "render", asset });
    return asset;
  }

  async create(intent: VideoIntent, brand: BrandContext | undefined): Promise<VideoAsset> {
    return this.render(await this.plan(intent, brand), brand);
  }

  async compose(output: SyncedVideoOutput): Promise<VideoAsset> {
    const first = output.videoTrack[0];
    if (!first) {
      throw new Error("compose requires at least one video track");
    }
    const id = assetId("composition", first.id);
    const path = join(this.#root, ".nebutra", "generated", "video-pipeline", `${id}.compose.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    return { ...first, id, path, storyboardId: first.storyboardId };
  }

  async cost(storyboard: Storyboard): Promise<{ estimatedUsd: number; durationS: number }> {
    return {
      estimatedUsd: Number((storyboard.totalDurationS * 0.003).toFixed(4)),
      durationS: storyboard.totalDurationS,
    };
  }

  async preview(storyboard: Storyboard): Promise<{ path: string }> {
    const path = join(
      this.#root,
      ".nebutra",
      "generated",
      "video-pipeline",
      `${storyboard.id}.preview.json`,
    );
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
    return { path };
  }

  async doctor(): Promise<VideoHealth[]> {
    return [
      { provider: "manifest-local", ok: true },
      {
        provider: "local-video-model",
        ok: Boolean(process.env.VIDEO_LOCAL_MODEL_PATH),
        suggestion: "Set VIDEO_LOCAL_MODEL_PATH to enable local clip rendering.",
      },
      {
        provider: "remote-video",
        ok: Boolean(process.env.VIDEO_REMOTE_API_KEY),
        suggestion: "Set VIDEO_REMOTE_API_KEY to enable remote video fallback.",
      },
    ];
  }
}
