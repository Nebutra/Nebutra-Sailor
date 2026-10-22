import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UI_SRC } from "@/lib/components/ui-source";
import { BLOCKS_DIR } from "@/lib/showcase-blocks";

/**
 * Source text for the showcase, read at build time (the routes that call this
 * are prerendered), so the code shown is the code that renders.
 */

function appRoot(): string {
  // `next` runs from apps/design; a monorepo-root invocation finds it one level down.
  const here = process.cwd();
  return existsSync(join(here, BLOCKS_DIR)) ? here : join(here, "apps", "design");
}

export function readBlockSource(file: string): string {
  return readFileSync(join(appRoot(), BLOCKS_DIR, file), "utf8");
}

export function readDemoSource(demoId: string): string | null {
  const file = join(UI_SRC, "catalog", "demos", `${demoId}.tsx`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}
