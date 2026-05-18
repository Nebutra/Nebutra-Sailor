import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type MeshAsset, MeshPipeline } from "@nebutra/3d-pipeline";
import { type AudioAsset, AudioPipeline } from "@nebutra/audio-pipeline";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore, serializeContentFrontmatter } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import {
  assetId,
  type BrandColor,
  type BrandContext,
  type VisualStyle,
} from "@nebutra/generation-context";
import { type ImageAsset, ImagePipeline } from "@nebutra/image-pipeline";
import { type Storyboard, type VideoAsset, VideoPipeline } from "@nebutra/video-pipeline";
import { type VoiceAsset, VoiceRealtime } from "@nebutra/voice-realtime";

export type VisualDirectionHint =
  | "cyberpunk"
  | "minimal"
  | "organic"
  | "playful"
  | "corporate"
  | "retro"
  | "futurist";

export interface BrandFilmInput {
  readonly tenantId?: string;
  readonly idea: string;
  readonly founderVoiceId?: string;
  readonly visualDirectionHint?: VisualDirectionHint;
}

export interface BrandIdentityDraft {
  readonly name: string;
  readonly oneLiner: string;
  readonly tagline: string;
  readonly targetAudience: string;
  readonly toneKeywords: readonly string[];
  readonly differentiation: string;
  readonly visualStyle: VisualStyle;
}

export interface BrandPackage {
  readonly tenantId: string;
  readonly play: "brand_film_60s";
  readonly brand: BrandContext;
  readonly draft: BrandIdentityDraft;
  readonly brandMdPath: string;
  readonly palettePath: string;
  readonly landingPath: string;
  readonly logo: ImageAsset;
  readonly hero: ImageAsset;
  readonly icon: ImageAsset;
  readonly mesh: MeshAsset;
  readonly storyboard: Storyboard;
  readonly film: VideoAsset;
  readonly bgm: AudioAsset;
  readonly narration: VoiceAsset;
  readonly eventId: string;
  readonly checkpoints: readonly string[];
}

export interface BrandGenesisDoctorReport {
  readonly capability: "brand-genesis";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly play: {
    readonly ok: boolean;
    readonly name: "brand_film_60s";
    readonly requiredSkills: readonly string[];
  };
  readonly media: {
    readonly image: readonly unknown[];
    readonly video: readonly unknown[];
    readonly audio: readonly unknown[];
    readonly voice: readonly unknown[];
    readonly mesh: readonly unknown[];
  };
  readonly suggestion?: string;
}

export interface BrandGenesisOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
  readonly imagePipeline?: ImagePipeline;
  readonly videoPipeline?: VideoPipeline;
  readonly audioPipeline?: AudioPipeline;
  readonly voiceRealtime?: VoiceRealtime;
  readonly meshPipeline?: MeshPipeline;
}

const PLAY_NAME = "brand_film_60s" as const;
const CHECKPOINTS = [
  "brand_distillation",
  "visual_direction",
  "assets_generated",
  "video_rendered",
  "final_compose",
] as const;

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId?.trim()) {
    throw new CapabilityError("brand-genesis", "Brand Genesis requires tenant context", {
      suggestion: "Pass tenantId on the input or construct BrandGenesis with tenantId.",
      statusCode: 400,
    });
  }
  return tenantId;
}

function normalizeBrandId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function pickName(idea: string): string {
  const called = idea.match(/\bcalled\s+([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)?)/);
  if (called?.[1]) return called[1].trim();
  const capitalized = [...idea.matchAll(/\b[A-Z][a-zA-Z0-9]{2,}\b/g)]
    .map((match) => match[0])
    .filter((value) => !["AI", "SaaS", "API"].includes(value));
  return capitalized.at(-1) ?? "Venture";
}

function paletteFor(hint: VisualDirectionHint | undefined): readonly BrandColor[] {
  switch (hint) {
    case "cyberpunk":
    case "futurist":
      return [
        { name: "electric cyan", hex: "#00D4FF", role: "primary" },
        { name: "carbon black", hex: "#111318", role: "background" },
        { name: "signal amber", hex: "#F3C14B", role: "accent" },
      ];
    case "organic":
      return [
        { name: "moss", hex: "#3D7A57", role: "primary" },
        { name: "paper", hex: "#F7F4EA", role: "background" },
        { name: "clay", hex: "#C86B4A", role: "accent" },
      ];
    case "playful":
      return [
        { name: "coral", hex: "#FF6B6B", role: "primary" },
        { name: "ink", hex: "#202124", role: "neutral" },
        { name: "mint", hex: "#7CE2C6", role: "accent" },
      ];
    case "corporate":
      return [
        { name: "trust blue", hex: "#2454D6", role: "primary" },
        { name: "slate", hex: "#202A36", role: "neutral" },
        { name: "clear sky", hex: "#E8F0FF", role: "background" },
      ];
    case "retro":
      return [
        { name: "oxide", hex: "#B95F3B", role: "primary" },
        { name: "night ink", hex: "#18202A", role: "neutral" },
        { name: "cream light", hex: "#F8E7C9", role: "background" },
      ];
    default:
      return [
        { name: "graphite", hex: "#1F2933", role: "primary" },
        { name: "white", hex: "#FFFFFF", role: "background" },
        { name: "signal green", hex: "#00A693", role: "accent" },
      ];
  }
}

function styleFor(hint: VisualDirectionHint | undefined): VisualStyle {
  const name = hint ?? "minimal";
  const keywordsByHint: Record<VisualDirectionHint, readonly string[]> = {
    cyberpunk: ["electric", "terminal-native", "high-contrast"],
    minimal: ["calm", "precise", "spacious"],
    organic: ["warm", "natural", "human"],
    playful: ["bright", "friendly", "kinetic"],
    corporate: ["credible", "structured", "clear"],
    retro: ["nostalgic", "tactile", "characterful"],
    futurist: ["clean", "technical", "forward"],
  };
  return {
    name,
    keywords: keywordsByHint[name],
    avoid: ["generic stock", "dark horror", "visual clutter"],
  };
}

export function distillBrandIdea(input: BrandFilmInput): BrandIdentityDraft {
  const idea = input.idea.trim();
  if (idea.length === 0) {
    throw new CapabilityError("brand-genesis", "Brand idea is empty", {
      suggestion: "Pass a one-sentence company idea before running Brand Genesis.",
      statusCode: 400,
    });
  }
  const name = pickName(idea);
  const devAudience = /\bdev|debug|code|developer|engineering/i.test(idea);
  const audience = devAudience
    ? "Independent developers and small engineering teams shipping software quickly"
    : "Early-stage founders validating a focused product wedge";
  const toneKeywords = devAudience
    ? ["technical", "direct", "warm"]
    : ["clear", "confident", "useful"];
  return {
    name,
    oneLiner: idea,
    tagline: devAudience ? "Debug like it is a conversation" : `${name} turns intent into launch`,
    targetAudience: audience,
    toneKeywords,
    differentiation: devAudience
      ? "Understands the full production context instead of treating each error as an isolated message"
      : "Combines brand, execution, and company memory in one repeatable workflow",
    visualStyle: styleFor(input.visualDirectionHint),
  };
}

export function brandContextFromDraft(
  draft: BrandIdentityDraft,
  tenantId: string,
  sourcePath = "company/BRAND.md",
  palette = paletteFor(draft.visualStyle.name as VisualDirectionHint),
): BrandContext {
  return {
    tenantId,
    brandId: normalizeBrandId(draft.name),
    name: draft.name,
    palette,
    typography: {
      heading: draft.visualStyle.name === "cyberpunk" ? "Geist Mono" : "Geist Sans",
      body: "Geist Sans",
      accent: "Geist Mono",
    },
    visualStyle: draft.visualStyle,
    referenceImages: [],
    forbidden: draft.visualStyle.avoid ?? [],
    toneKeywords: draft.toneKeywords,
    sourcePath,
  };
}

export function renderBrandMarkdown(draft: BrandIdentityDraft, brand: BrandContext): string {
  return serializeContentFrontmatter(
    {
      type: "brand_profile",
      brand_id: brand.brandId,
      name: brand.name,
    },
    [
      `# ${brand.name}`,
      "",
      draft.oneLiner,
      "",
      "## Tagline",
      "",
      draft.tagline,
      "",
      "## Audience",
      "",
      draft.targetAudience,
      "",
      "## Tone",
      "",
      brand.toneKeywords.join(", "),
      "",
      "## Visual Direction",
      "",
      `${brand.visualStyle.name}: ${brand.visualStyle.keywords.join(", ")}`,
      "",
      "## Differentiation",
      "",
      draft.differentiation,
      "",
    ].join("\n"),
  );
}

function renderLandingManifest(draft: BrandIdentityDraft, brand: BrandContext): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${brand.name}</title>`,
    "</head>",
    "<body>",
    `  <main data-brand-id="${brand.brandId}">`,
    `    <h1>${brand.name}</h1>`,
    `    <p>${draft.tagline}</p>`,
    `    <p>${draft.oneLiner}</p>`,
    "  </main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export class BrandGenesis {
  readonly #tenantId: string | undefined;
  readonly #root: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;
  readonly #image: ImagePipeline;
  readonly #video: VideoPipeline;
  readonly #audio: AudioPipeline;
  readonly #voice: VoiceRealtime;
  readonly #mesh: MeshPipeline;

  private constructor(
    options: BrandGenesisOptions & { contentStore: ContentStore; eventLog: EventLog },
  ) {
    this.#tenantId = options.tenantId;
    this.#root = options.root ?? join(process.cwd(), ".nebutra", "brand-genesis");
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
    this.#image = options.imagePipeline ?? new ImagePipeline({ root: this.#root });
    this.#video = options.videoPipeline ?? new VideoPipeline({ root: this.#root });
    this.#audio = options.audioPipeline ?? new AudioPipeline({ root: this.#root });
    this.#voice = options.voiceRealtime ?? new VoiceRealtime({ root: this.#root });
    this.#mesh = options.meshPipeline ?? new MeshPipeline({ root: this.#root });
  }

  static async open(
    root = ".nebutra/brand-genesis",
    options: Omit<BrandGenesisOptions, "root" | "contentStore" | "eventLog"> = {},
  ): Promise<BrandGenesis> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new BrandGenesis({ ...options, tenantId, root, contentStore, eventLog });
  }

  async run(input: BrandFilmInput): Promise<BrandPackage> {
    const tenantId = requireTenant(input.tenantId, this.#tenantId);
    const draft = distillBrandIdea(input);
    const brand = brandContextFromDraft(draft, tenantId);
    const brandMarkdown = renderBrandMarkdown(draft, brand);
    await this.#contentStore.write(brand.sourcePath, brandMarkdown);
    const palettePath = "company/assets/palette.json";
    await this.#contentStore.write(
      palettePath,
      `${JSON.stringify({ brandId: brand.brandId, colors: brand.palette }, null, 2)}\n`,
    );
    await this.#debug({
      type: "checkpoint",
      step: CHECKPOINTS[0],
      tenantId,
      brandId: brand.brandId,
    });
    await this.#debug({
      type: "checkpoint",
      step: CHECKPOINTS[1],
      tenantId,
      brandId: brand.brandId,
    });

    const [logo, hero, icon] = await Promise.all([
      this.#image.generate({ type: "logo", company: brand.name, oneLiner: draft.oneLiner }, brand),
      this.#image.generate({ type: "hero", headline: draft.tagline }, brand),
      this.#image.generate({ type: "icon", subject: brand.name }, brand),
    ]);
    const mesh = await this.#mesh.fromImage(logo, brand);
    await this.#debug({
      type: "checkpoint",
      step: CHECKPOINTS[2],
      tenantId,
      brandId: brand.brandId,
    });

    const storyboard = await this.#video.plan(
      { type: "brand-film", durationS: 60, theme: draft.tagline },
      brand,
    );
    const rendered = await this.#video.render(storyboard, brand);
    await this.#debug({
      type: "checkpoint",
      step: CHECKPOINTS[3],
      tenantId,
      brandId: brand.brandId,
    });

    const bgm = await this.#audio.generate(
      { type: "bgm", durationS: rendered.durationS, mood: brand.toneKeywords.join(" ") },
      brand,
      true,
    );
    const narration = await this.#voice.synthesizeNarration(
      {
        script: `${draft.tagline}. ${draft.oneLiner}. ${draft.differentiation}.`,
        targetDurationS: Math.max(8, Math.min(20, rendered.durationS - 3)),
        ...(input.founderVoiceId !== undefined ? { voiceProfileId: input.founderVoiceId } : {}),
      },
      brand,
    );
    const film = await this.#video.compose({
      videoTrack: [rendered],
      audioTrack: [bgm],
      voiceTrack: [narration],
      captionTrack: [{ startS: 0, endS: narration.durationS, text: narration.transcript }],
    });
    const landingPath = "company/landing/index.html";
    await this.#contentStore.write(landingPath, renderLandingManifest(draft, brand));
    await this.#debug({
      type: "checkpoint",
      step: CHECKPOINTS[4],
      tenantId,
      brandId: brand.brandId,
    });

    const eventId = await this.#eventLog.commit({
      traceId: assetId("brand_genesis", brand.brandId),
      kind: "content_write",
      affected: [
        brand.sourcePath,
        palettePath,
        landingPath,
        logo.path,
        hero.path,
        icon.path,
        film.path,
      ],
      parent: null,
      snapshot: {
        [brand.sourcePath]: brandMarkdown,
        [palettePath]: JSON.stringify({ brandId: brand.brandId, colors: brand.palette }, null, 2),
        [landingPath]: renderLandingManifest(draft, brand),
      },
    });

    const result: BrandPackage = {
      tenantId,
      play: PLAY_NAME,
      brand,
      draft,
      brandMdPath: brand.sourcePath,
      palettePath,
      landingPath,
      logo,
      hero,
      icon,
      mesh,
      storyboard,
      film,
      bgm,
      narration,
      eventId,
      checkpoints: CHECKPOINTS,
    };
    await this.#debug({ type: "run", tenantId, brandId: brand.brandId, eventId });
    return result;
  }

  async doctor(): Promise<BrandGenesisDoctorReport> {
    const [image, video, audio, rawVoice, mesh] = await Promise.all([
      this.#image.doctor(),
      this.#video.doctor(),
      this.#audio.doctor(),
      this.#voice.doctor(),
      this.#mesh.doctor(),
    ]);
    const voice = [{ provider: "narration-local", ok: true }, ...rawVoice];
    const localOk = [image, video, audio, voice, mesh].every((checks) =>
      checks.some((check) => Boolean((check as { ok?: boolean }).ok)),
    );
    return {
      capability: "brand-genesis",
      ok: localOk,
      checkedAt: new Date().toISOString(),
      play: {
        ok: true,
        name: PLAY_NAME,
        requiredSkills: [
          "image_pipeline.generate",
          "video_pipeline.plan",
          "video_pipeline.render",
          "video_pipeline.compose",
          "audio_pipeline.generate",
          "voice_realtime.synthesize_narration",
          "mesh_pipeline.from_image",
          "content_store.write",
        ],
      },
      media: { image, video, audio, voice, mesh },
      ...(!localOk
        ? {
            suggestion:
              "Run the individual media doctor commands and configure missing local or remote providers.",
          }
        : {}),
    };
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(join(this.#debugRoot, ".nebutra", "debug", "brand-genesis.jsonl")), {
      recursive: true,
    });
    await appendCapabilityDebug("brand-genesis", entry, { root: this.#debugRoot });
  }
}

export async function readBrandGenesisDebug(root = process.cwd(), limit = 20): Promise<unknown[]> {
  return readCapabilityDebug("brand-genesis", { root, limit });
}
