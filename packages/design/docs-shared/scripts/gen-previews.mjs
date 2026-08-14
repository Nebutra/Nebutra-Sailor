#!/usr/bin/env node
/** Regenerate src/components/previews/index.ts from the folder's contents. */
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src/components/previews");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.slice(0, -4))
  .sort();

const header = `/**
 * Lazy registry of every preview in this folder — AUTO-GENERATED.
 * Regenerate: pnpm --filter @nebutra/docs-shared gen:previews
 *
 * The design site used to reach in with a template-literal dynamic import
 * (\`@nebutra/docs-shared/components/previews/\${id}\`). webpack has to resolve
 * the folder itself to build a context for that, and an \`exports\` map only
 * ever yields files, so it resolved to nothing on a clean checkout — while a
 * tree with stale build output happened to satisfy it.
 *
 * A registry the package owns removes the question: every entry is a static
 * import specifier webpack can see, and a preview that is deleted stops
 * existing here rather than failing at runtime.
 */

export const PREVIEW_MODULES = {
`;

const body = files.map((f) => `  "${f}": () => import("./${f}"),`).join("\n");
const footer = `
} as const;

export type PreviewId = keyof typeof PREVIEW_MODULES;

export function isPreviewId(id: string): id is PreviewId {
  return Object.hasOwn(PREVIEW_MODULES, id);
}
`;

writeFileSync(join(dir, "index.ts"), header + body + footer);
process.stdout.write(`previews registry: ${files.length} entries\n`);
