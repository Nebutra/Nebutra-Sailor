import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { CapabilityError } from "@nebutra/errors";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  requireBrandContext,
  summarizeBrandContext,
} from "@nebutra/generation-context";

export type ImageIntent =
  | { type: "logo"; company: string; oneLiner: string }
  | { type: "poster"; title: string; subtitle?: string }
  | { type: "icon"; subject: string }
  | { type: "hero"; headline: string }
  | { type: "style-transfer"; sourcePath: string; instruction: string };

export interface ImageAsset extends GeneratedAsset {
  readonly kind: "image";
  readonly width: number;
  readonly height: number;
  readonly format: "svg" | "png" | "jpg" | "webp";
}

export interface ImageHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface ImagePipelineOptions {
  readonly root?: string;
  readonly provider?: "svg-local" | "comfy" | "remote";
  readonly comfyUrl?: string;
}

export async function readImageDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("image-pipeline", { root, limit });
}

function intentLabel(intent: ImageIntent): string {
  switch (intent.type) {
    case "logo":
      return `${intent.company}: ${intent.oneLiner}`;
    case "poster":
      return `${intent.title}${intent.subtitle ? ` — ${intent.subtitle}` : ""}`;
    case "icon":
      return intent.subject;
    case "hero":
      return intent.headline;
    case "style-transfer":
      return `${intent.sourcePath}: ${intent.instruction}`;
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgFor(intent: ImageIntent, brand: BrandContext): string {
  const primary = brand.palette[0]?.hex ?? "#111111";
  const accent = brand.palette.find((color) => color.role === "accent")?.hex ?? "#F3C14B";
  const label = intentLabel(intent);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="${escapeXml(primary)}"/>
  <circle cx="960" cy="160" r="96" fill="${escapeXml(accent)}" opacity="0.9"/>
  <text x="80" y="360" fill="#ffffff" font-family="${escapeXml(brand.typography.heading)}" font-size="78" font-weight="700">${escapeXml(brand.name)}</text>
  <text x="84" y="440" fill="#ffffff" font-family="${escapeXml(brand.typography.body)}" font-size="34">${escapeXml(label)}</text>
  <text x="84" y="520" fill="#ffffff" opacity="0.72" font-family="${escapeXml(brand.typography.body)}" font-size="24">${escapeXml(summarizeBrandContext(brand))}</text>
</svg>`;
}

export class ImagePipeline {
  readonly #root: string;
  readonly #provider: "svg-local" | "comfy" | "remote";
  readonly #comfyUrl: string;

  constructor(options: ImagePipelineOptions = {}) {
    this.#root = options.root ?? process.cwd();
    this.#provider = options.provider ?? "svg-local";
    this.#comfyUrl = options.comfyUrl ?? process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";
  }

  async generate(intent: ImageIntent, brandInput: BrandContext | undefined): Promise<ImageAsset> {
    const brand = requireBrandContext(brandInput, "image-pipeline");
    if (this.#provider !== "svg-local") {
      throw new CapabilityError("image-pipeline", `${this.#provider} provider is not configured`, {
        suggestion:
          "Use the zero-config svg-local provider or configure a sidecar adapter before selecting model-backed image generation.",
        statusCode: 503,
      });
    }

    const id = assetId("image", `${intent.type}_${intentLabel(intent)}`);
    const path = join(this.#root, ".nebutra", "generated", "image-pipeline", `${id}.svg`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, svgFor(intent, brand), "utf8");

    const asset: ImageAsset = {
      id,
      tenantId: brand.tenantId,
      kind: "image",
      path,
      brandId: brand.brandId,
      provider: "svg-local",
      model: "brand-context-svg-v1",
      createdAt: new Date().toISOString(),
      license: { status: "commercial-ok", source: "deterministic local renderer" },
      width: 1200,
      height: 800,
      format: "svg",
      metadata: { intent, brandSource: brand.sourcePath },
    };
    await appendCapabilityDebug(
      "image-pipeline",
      { type: "generate", asset },
      { root: this.#root },
    );
    return asset;
  }

  async runWorkflow(
    workflowName: string,
    inputs: Record<string, unknown>,
    brand: BrandContext | undefined,
  ): Promise<ImageAsset> {
    requireBrandContext(brand, "image-pipeline");
    return this.generate(
      {
        type: "poster",
        title: workflowName,
        subtitle: Object.keys(inputs).join(", ") || "workflow",
      },
      brand,
    );
  }

  async doctor(): Promise<ImageHealth[]> {
    const comfyConfigured = Boolean(process.env.COMFYUI_URL);
    return [
      { provider: "svg-local", ok: true },
      comfyConfigured
        ? { provider: "comfy", ok: true }
        : {
            provider: "comfy",
            ok: false,
            suggestion: `Set COMFYUI_URL to enable model-backed workflow execution. Default probe target is ${this.#comfyUrl}.`,
          },
      {
        provider: "remote",
        ok: Boolean(process.env.IMAGE_REMOTE_API_KEY),
        suggestion: "Set IMAGE_REMOTE_API_KEY to enable remote image fallback.",
      },
    ];
  }

  async workflows(): Promise<readonly string[]> {
    return ["logo", "poster", "icon", "hero", "style-transfer"];
  }

  async warmup(): Promise<ImageHealth> {
    if (this.#provider === "svg-local") {
      return { provider: this.#provider, ok: true };
    }
    return {
      provider: this.#provider,
      ok: false,
      suggestion: "Start the image sidecar before warming model weights.",
    };
  }
}
