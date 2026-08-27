import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import {
  assetId,
  type BrandContext,
  type GeneratedAsset,
  requireBrandContext,
  summarizeBrandContext,
} from "@nebutra/generation-context";
import type { ImageAsset } from "@nebutra/image-pipeline";

export type MeshIntent =
  | { type: "product-mockup"; description: string }
  | { type: "logo-extrusion"; depth: number }
  | { type: "icon-pack"; count: number };

export interface MeshAsset extends GeneratedAsset {
  readonly kind: "mesh";
  readonly gltfPath: string;
  readonly usdzPath?: string;
  readonly objPath?: string;
  readonly fbxPath?: string;
  readonly previewImagePath: string;
  readonly triangleCount: number;
  readonly format: "gltf";
}

export interface MeshHealth {
  readonly provider: string;
  readonly ok: boolean;
  readonly suggestion?: string;
}

export interface MeshPipelineOptions {
  readonly root?: string;
}

export async function readMeshDebug(root = process.cwd(), limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("3d-pipeline", { root, limit });
}

function gltfDocument(brand: BrandContext, intent: MeshIntent): Record<string, unknown> {
  return {
    asset: { version: "2.0", generator: "@nebutra/3d-pipeline deterministic mesh" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: `${brand.name} ${intent.type}` }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0,
          },
        ],
      },
    ],
    materials: [{ name: brand.palette[0]?.name ?? "brand", pbrMetallicRoughness: {} }],
    extras: { brand: summarizeBrandContext(brand), intent },
  };
}

function previewSvg(brand: BrandContext, intent: MeshIntent): string {
  const primary = brand.palette[0]?.hex ?? "#111111";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
  <rect width="640" height="480" fill="${primary}"/>
  <polygon points="320,72 520,360 120,360" fill="#ffffff" opacity="0.88"/>
  <text x="64" y="430" fill="#ffffff" font-family="${brand.typography.body}" font-size="28">${brand.name} ${intent.type}</text>
</svg>`;
}

export class MeshPipeline {
  readonly #root: string;

  constructor(options: MeshPipelineOptions = {}) {
    this.#root = options.root ?? process.cwd();
  }

  async fromText(description: string, brandInput: BrandContext | undefined): Promise<MeshAsset> {
    return this.#write({ type: "product-mockup", description }, brandInput);
  }

  async fromImage(
    image: Pick<ImageAsset, "path">,
    brandInput: BrandContext | undefined,
  ): Promise<MeshAsset> {
    return this.#write(
      { type: "product-mockup", description: `image-to-mesh source ${image.path}` },
      brandInput,
    );
  }

  async batchFromIntent(
    intent: MeshIntent,
    brandInput: BrandContext | undefined,
  ): Promise<MeshAsset[]> {
    const count = intent.type === "icon-pack" ? Math.max(1, Math.min(intent.count, 10)) : 1;
    const assets: MeshAsset[] = [];
    for (let index = 0; index < count; index += 1) {
      assets.push(await this.#write(intent, brandInput));
    }
    return assets;
  }

  async preview(asset: MeshAsset): Promise<{ path: string }> {
    return { path: asset.previewImagePath };
  }

  async export(
    asset: MeshAsset,
    format: "gltf" | "obj" | "usdz" | "fbx" = "gltf",
  ): Promise<{ path: string }> {
    if (format === "gltf") return { path: asset.gltfPath };
    const path = join(
      this.#root,
      ".nebutra",
      "generated",
      "3d-pipeline",
      `${asset.id}.${format}.json`,
    );
    await writeFile(
      path,
      `${JSON.stringify({ source: asset.gltfPath, format }, null, 2)}\n`,
      "utf8",
    );
    return { path };
  }

  async doctor(): Promise<MeshHealth[]> {
    return [
      { provider: "gltf-local", ok: true },
      {
        provider: "local-mesh-model",
        ok: Boolean(process.env.MESH_LOCAL_MODEL_PATH),
        suggestion: "Set MESH_LOCAL_MODEL_PATH to enable local mesh generation.",
      },
      {
        provider: "remote-mesh",
        ok: Boolean(process.env.MESH_REMOTE_API_KEY),
        suggestion: "Set MESH_REMOTE_API_KEY to enable remote mesh fallback.",
      },
    ];
  }

  async #write(intent: MeshIntent, brandInput: BrandContext | undefined): Promise<MeshAsset> {
    const brand = requireBrandContext(brandInput, "3d-pipeline");
    const id = assetId("mesh", `${intent.type}_${brand.brandId}`);
    const dir = join(this.#root, ".nebutra", "generated", "3d-pipeline");
    const gltfPath = join(dir, `${id}.gltf`);
    const previewImagePath = join(dir, `${id}.svg`);
    await mkdir(dir, { recursive: true });
    await writeFile(gltfPath, `${JSON.stringify(gltfDocument(brand, intent), null, 2)}\n`, "utf8");
    await writeFile(previewImagePath, previewSvg(brand, intent), "utf8");

    const asset: MeshAsset = {
      id,
      tenantId: brand.tenantId,
      kind: "mesh",
      path: gltfPath,
      gltfPath,
      previewImagePath,
      brandId: brand.brandId,
      provider: "gltf-local",
      model: "brand-context-gltf-v1",
      createdAt: new Date().toISOString(),
      license: { status: "commercial-ok", source: "deterministic local mesh" },
      triangleCount: 1,
      format: "gltf",
      metadata: { intent, brandSource: brand.sourcePath },
    };
    await appendCapabilityDebug("3d-pipeline", { type: "mesh", asset }, { root: this.#root });
    return asset;
  }
}
