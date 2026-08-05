import { readdirSync } from "node:fs";
import { join } from "node:path";
import { coveredNames } from "@/lib/components/registry";

/**
 * The demo surface that lives in `@nebutra/docs-shared`, read off disk.
 *
 * There are around a hundred and ninety of these and they are the half of the
 * library this site never showed: globes, shaders, aurora text, confetti, device
 * mockups, the animated backgrounds. They were only ever reachable through
 * design-docs, which is the app being retired, so retiring it would have taken
 * them with it.
 *
 * Nothing here is a hand-kept list. The directory is the list — a demo added to
 * docs-shared appears on the next build, and one deleted disappears. The split
 * between "already documented" and "showcase" is derived too: a demo whose base
 * name matches a component that has a page belongs to that page, and everything
 * else is what this section is for.
 */

const PREVIEWS_DIR = join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "design",
  "docs-shared",
  "src",
  "components",
  "previews",
);

export interface ShowcaseDemo {
  /** File base name, which is also the import specifier suffix. */
  id: string;
  /** Human label — the base name with the -demo suffix removed. */
  label: string;
}

function toLabel(id: string): string {
  return id
    .replace(/-demo$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Normalised name for matching a demo against a documented component. */
function baseName(id: string): string {
  return id
    .replace(/-demo$/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, "")
    .toLowerCase();
}

let cached: ShowcaseDemo[] | null = null;

export function showcaseDemos(): ShowcaseDemo[] {
  if (cached) return cached;

  let files: string[] = [];
  try {
    files = readdirSync(PREVIEWS_DIR);
  } catch {
    // The design site must still build when docs-shared is absent from the
    // graph — an empty showcase is a visible gap, a build failure is not.
    cached = [];
    return cached;
  }

  const documented = new Set([...coveredNames()].map((name) => name.toLowerCase()));

  cached = files
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""))
    .filter((id) => !documented.has(baseName(id)))
    .sort()
    .map((id) => ({ id, label: toLabel(id) }));

  return cached;
}
