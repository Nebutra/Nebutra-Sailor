/**
 * Helpers for reading shadcn-style registry manifests written by
 * packages/design/ui/scripts/build-registry.ts into apps/design-docs/public/r/
 *
 * Read-only at request time — the JSON is generated at build (prebuild) time.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_DIR = join(process.cwd(), "public");
let registryIndexCache: RegistryIndex | undefined;

export interface RegistryIndexEntry {
  name: string;
  type: string;
  title?: string;
  description?: string;
  meta?: {
    nebutraLayer?: string;
    docs?: RegistryDocsMetadata;
  };
}

export interface RegistryIndex {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryIndexEntry[];
}

export interface RegistryItemFile {
  path: string;
  type: string;
  content: string;
  target?: string;
}

export interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title: string;
  description: string;
  author?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryItemFile[];
  cssVars?: { light: Record<string, string>; dark: Record<string, string> };
  meta?: {
    nebutraTokens?: string[];
    nebutraLayer?: string;
    docs?: RegistryDocsMetadata;
  };
}

export interface RegistryDocsMetadata {
  status: "stable" | "beta" | "deprecated" | "experimental";
  maturity: "experimental" | "beta" | "stable" | "canonical";
  layer: "foundation" | "primitive" | "composition" | "pattern" | "registry" | "api" | "guide";
  package: "@nebutra/ui" | "@nebutra/tokens";
  source: string;
  substrate: "native" | "custom" | "mixed";
  registry: true;
  lastVerified: string;
}

/**
 * Read the top-level registry index. Missing registry output is a build error:
 * this app publicly serves ui.nebutra.com, so an empty registry would be silent
 * distribution drift rather than a useful fallback.
 */
export function loadRegistryIndex(): RegistryIndex {
  if (registryIndexCache) return registryIndexCache;

  try {
    const raw = readFileSync(join(PUBLIC_DIR, "registry.json"), "utf-8");
    registryIndexCache = JSON.parse(raw) as RegistryIndex;
    return registryIndexCache;
  } catch (error) {
    throw new Error(
      "Missing or invalid public/registry.json. Run `pnpm --filter @nebutra/design-docs prebuild` or `pnpm --filter @nebutra/ui build:registry` before rendering registry routes.",
      { cause: error },
    );
  }
}

export function loadRegistryItem(name: string): RegistryItem | null {
  try {
    const raw = readFileSync(join(PUBLIC_DIR, "r", `${name}.json`), "utf-8");
    return JSON.parse(raw) as RegistryItem;
  } catch {
    return null;
  }
}

export function getRegistryDocsMetadata(name: string): RegistryDocsMetadata | undefined {
  return loadRegistryIndex().items.find((item) => item.name === name)?.meta?.docs;
}
