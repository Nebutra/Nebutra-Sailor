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
 * Read the top-level registry index. Returns an empty index if missing —
 * the registry build script must run during `prebuild` to populate it.
 */
export function loadRegistryIndex(): RegistryIndex {
  try {
    const raw = readFileSync(join(PUBLIC_DIR, "registry.json"), "utf-8");
    return JSON.parse(raw) as RegistryIndex;
  } catch {
    return {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "nebutra-ui",
      homepage: "https://ui.nebutra.com",
      items: [],
    };
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
