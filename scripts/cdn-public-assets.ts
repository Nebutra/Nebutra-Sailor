import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const CDN_ASSET_BUCKET = "nebutra-assets";
export const CDN_CACHE_CONTROL = "public, max-age=300, s-maxage=86400";

export type CdnSeedObject = {
  key: string;
  file: string;
  contentType: string;
};

type SeedTree = {
  keyPrefix: string;
  root: string;
  include: readonly string[];
};

export const PUBLIC_CDN_TREES: readonly SeedTree[] = [
  {
    keyPrefix: "landing",
    root: "apps/landing/public",
    include: [
      "images/about",
      "images/blog/covers",
      "screenshots",
      "animations",
      "logos/vc",
      "logos/vc-global",
      "dashboard",
    ],
  },
  {
    keyPrefix: "router",
    root: "apps/router/public",
    include: [
      "banners",
      "product/router-repeater.png",
      "product/forge-anvil.png",
      "product/forge-empty.png",
      "product/router-empty.png",
    ],
  },
  {
    keyPrefix: "forge",
    root: "apps/forge/public",
    include: ["product/forge-anvil.png", "product/forge-empty.png", "product/router-repeater.png"],
  },
  {
    keyPrefix: "pebble",
    root: "apps/pebble/public",
    include: ["assets/hero.jpg", "assets/mark.png", "assets/logo.svg"],
  },
  {
    keyPrefix: "brand",
    root: "packages/design/brand/assets",
    include: ["logo", "logo-compliant"],
  },
];

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".lottie": "application/zip",
};

function extOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function contentTypeFor(name: string): string | null {
  return CONTENT_TYPE[extOf(name)] ?? null;
}

function walkFiles(abs: string): string[] {
  if (!existsSync(abs)) {
    return [];
  }
  if (statSync(abs).isFile()) {
    return [abs];
  }
  return readdirSync(abs)
    .filter((name) => !name.startsWith("."))
    .flatMap((name) => walkFiles(join(abs, name)));
}

export function listPublicCdnSeedObjects(repoRoot: string): CdnSeedObject[] {
  const objects: CdnSeedObject[] = [];
  for (const tree of PUBLIC_CDN_TREES) {
    for (const entry of tree.include) {
      const abs = join(repoRoot, tree.root, entry);
      for (const file of walkFiles(abs)) {
        const contentType = contentTypeFor(file);
        if (!contentType) {
          continue;
        }
        const rel = relative(join(repoRoot, tree.root), file).replaceAll("\\", "/");
        objects.push({
          key: `${tree.keyPrefix}/${rel}`,
          file,
          contentType,
        });
      }
    }
  }
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}
