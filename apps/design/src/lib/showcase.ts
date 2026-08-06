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

/**
 * Demos this section deliberately does not show.
 *
 * Two grounds, and they are different in kind.
 *
 * The canvas group is not a taste call: several WebGL demos on one page exhaust
 * the browser's live-context limit, and the one that loses its context throws
 * from inside a render — which used to take the whole page down about a third of
 * the way through a scroll. They also read as coloured blobs at card size, so
 * the thing costing us the page was not earning anything either.
 *
 * The rest is a taste call, made deliberately: a design system's job is to make
 * a product coherent, and a scrambling-text effect or a scroll-velocity marquee
 * is a trick that dates the surface it lands on. They remain in docs-shared for
 * anyone who wants one — they are just not held up here as something to reach
 * for.
 */
const EXCLUDED: ReadonlySet<string> = new Set([
  // Canvas and WebGL — the crash, and unreadable at this size.
  "canvas-reveal-effect-demo",
  "dithering-background-demo",
  "dithering-shader-demo",
  "stars-canvas-demo",
  "warp-background-demo",
  "light-rays-demo",
  "flickering-grid-demo",
  "globe-demo",
  "dotted-world-map-demo",
  "dotted-map-demo",
  "wave-animation-demo",
  "confetti-demo",
  "animated-beam-demo",

  // Novelty text effects.
  "aurora-text-demo",
  "text-scramble-demo",
  "scroll-velocity-demo",
  "video-text-demo",
  "line-shadow-text-demo",
  "gradient-animated-text-demo",
  "animated-gradient-text-demo",
  "animated-shiny-text-demo",
  "word-fade-in-demo",
  "highlighter-demo",

  // Decorative card chrome that fights the elevation ramp.
  "magic-card-demo",
  "shine-border-demo",
  "noise-pattern-card-demo",
  "grid-pattern-card-demo",
  "border-trail-demo",

  // Device and browser chrome — marketing props, not product surfaces.
  "iphone-mockup-demo",
  "safari-demo",
  "browser-mockup-demo",
  "book-demo",

  // Broken or empty at card size, verified by looking.
  "bento-grid-demo",
  "box-demo",
  "card-spotlight-demo",

  // Layout primitives; /patterns/layout covers this properly and to scale.
  "flex-demo",
  "stack-demo",
  "grid-system-demo",
  "heading-demo",
  "text-demo",
  "description-demo",
]);

/**
 * Does this demo belong to a component that already has a page?
 *
 * Prefix, not equality. `button-sizes-demo`, `badge-icon-demo` and
 * `input-error-demo` are variants of components documented properly elsewhere,
 * and matching on the exact name let all ninety of them leak into a section
 * that is supposed to be what the site does *not* otherwise cover. The showcase
 * was more than half button and input variants.
 */
function documentedElsewhere(id: string, slugs: readonly string[]): boolean {
  const base = id.replace(/-demo$/, "");
  return slugs.some((slug) => base === slug || base.startsWith(`${slug}-`));
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

  // Slugs rather than export names: the files are kebab-case, and a slug is
  // already the kebab form of the component this site documents.
  const slugs = [...coveredNames()].map((name) =>
    name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  );

  cached = files
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""))
    .filter((id) => !EXCLUDED.has(id))
    .filter((id) => !documentedElsewhere(id, slugs))
    .sort()
    .map((id) => ({ id, label: toLabel(id) }));

  return cached;
}
