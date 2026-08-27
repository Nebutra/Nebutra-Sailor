import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  requireBrandContext,
  summarizeBrandContext,
} from "@nebutra/generation-context";
import {
  type StoryboardPlan,
  type StoryboardScene,
  storyboardTotalDuration,
} from "@nebutra/reel/storyboard";

export type VideoIntent =
  | { type: "brand-film"; durationS: number; theme: string }
  | { type: "turntable"; durationS: number; subject: string }
  | { type: "clip"; durationS: number; prompt: string };

export type Storyboard = StoryboardPlan<VideoIntent>;

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

export async function readVideoDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("video-pipeline", { root, limit });
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
      const durationS =
        index === count - 1 ? intent.durationS - baseDuration * index : baseDuration;
      const prompt = `${brand.name} ${intent.type} scene ${sceneNumber}: ${summarizeBrandContext(brand)}`;
      return {
        id: `scene_${sceneNumber}`,
        sceneIndex: sceneNumber,
        prompt,
        description: prompt,
        duration: durationS,
        durationS,
        status: "draft",
        outputEnabled: true,
        selectedImageIndex: -1,
        outputHistory: [],
        outputHistoryCursor: -1,
        referenceImages: brand.referenceImages.map((reference) => reference.path),
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
      totalDurationS: storyboardTotalDuration(scenes),
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
    await appendCapabilityDebug("video-pipeline", { type: "render", asset }, { root: this.#root });
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
