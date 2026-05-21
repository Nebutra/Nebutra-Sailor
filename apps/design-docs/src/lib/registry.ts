/**
 * Helpers for reading shadcn-style registry manifests written by
 * packages/design/ui/scripts/build-registry.ts into apps/design-docs/public/r/
 *
 * Read-only at request time — the JSON is generated at build (prebuild) time.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_DIR = join(process.cwd(), "public");

export interface RegistryIndexEntry {
  name: string;
  type: string;
  title?: string;
  description?: string;
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
  meta?: { nebutraTokens?: string[]; nebutraLayer?: string };
}

/**
 * Read the top-level registry index. Missing registry output is a build error:
 * this app publicly serves ui.nebutra.com, so an empty registry would be silent
 * distribution drift rather than a useful fallback.
 */
export function loadRegistryIndex(): RegistryIndex {
  try {
    const raw = readFileSync(join(PUBLIC_DIR, "registry.json"), "utf-8");
    return JSON.parse(raw) as RegistryIndex;
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
