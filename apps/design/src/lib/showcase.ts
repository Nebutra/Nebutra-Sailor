import { CATALOG, CATALOG_CATEGORIES, type CatalogEntry, catalogEntry } from "@nebutra/ui/catalog";
import { COMPONENTS_BY_SLUG, coveredNames } from "@/lib/components/registry";
import {
  auditFor,
  demoLabel,
  type GraduationAudit,
  type GraduationCriterion,
  graduationGaps,
  type Natural,
  type ShowcaseStatus,
  type ShowcaseTier,
  sizeOf,
  statusOf,
  tierOf,
} from "@/lib/showcase-model";
import sizes from "@/lib/showcase-sizes.generated.json";

/**
 * The demo surface of the @nebutra/ui catalog, re-tiered into Core / Patterns /
 * Expressive / Lab (ADR 2026-09-27 UI catalog). Blocks are authored on the page,
 * not derived from here.
 *
 * Nothing here is a hand-kept list of components. The catalog is the list: a
 * demo added to it appears on the next build, and one deleted disappears. What
 * is hand-kept is only what the catalog cannot know: which demos cannot be
 * mounted in a list (and why), and the audit behind Expressive (see
 * showcase-model.ts).
 */

export interface ShowcaseDemo {
  /** File base name, which is also the import specifier suffix. */
  id: string;
  /** Human label - the base name with the -demo suffix removed. */
  label: string;
  /** The catalog entry the demo belongs to, and where its detail page is. */
  entry: string;
  href: string;
}

/**
 * Demos that cannot be mounted in a list of cards, and why.
 *
 * Two grounds, both about the page rather than taste.
 *
 * `webgl` - several canvas/WebGL demos mounted together exhaust the browser's
 * live-context limit, and the one that loses its context throws from inside a
 * render, which once took the whole page down. A card shows the entry and links
 * to its detail page, where one context at a time is fine.
 *
 * `global` - the demo reaches outside its frame by design: it mounts already
 * open and lays a scrim over the page, registers this site's own shortcut, or
 * is a viewport-fixed island. These have no live preview anywhere on the site;
 * the detail page gives the import and the reason.
 */
type Blocked = { kind: "webgl" | "global"; reason: string };

const BLOCKED: Readonly<Record<string, Blocked>> = {
  "canvas-reveal-effect-demo": { kind: "webgl", reason: "WebGL canvas" },
  "dithering-background-demo": { kind: "webgl", reason: "WebGL shader" },
  "stars-canvas-demo": { kind: "webgl", reason: "WebGL canvas" },
  "warp-background-demo": { kind: "webgl", reason: "WebGL canvas" },
  "light-rays-demo": { kind: "webgl", reason: "WebGL canvas" },
  "flickering-grid-demo": { kind: "webgl", reason: "Canvas animation loop" },
  "globe-demo": { kind: "webgl", reason: "WebGL globe" },
  "dotted-map-demo": { kind: "webgl", reason: "Canvas map" },
  "wave-animation-demo": { kind: "webgl", reason: "Canvas animation loop" },
  "confetti-demo": { kind: "webgl", reason: "Canvas particles" },
  "command-dialog-simple-demo": {
    kind: "global",
    reason: "Mounts open and covers the page with a scrim",
  },
  "command-dialog-demo": { kind: "global", reason: "Registers this site's own \u2318K shortcut" },
  "popover-controlled-demo": { kind: "global", reason: "Mounts open and portals out of its frame" },
  "dynamic-island-toc-demo": { kind: "global", reason: "A viewport-fixed island by design" },
};

/** Layout primitives; /patterns/layout covers them properly and to scale. */
const COVERED_ELSEWHERE: ReadonlySet<string> = new Set([
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
 * that is supposed to be what the site does *not* otherwise cover.
 */
function documentedElsewhere(id: string, slugs: readonly string[]): boolean {
  const base = id.replace(/-demo$/, "");
  return slugs.some((slug) => base === slug || base.startsWith(`${slug}-`));
}

let slugCache: string[] | null = null;
function coveredSlugs(): string[] {
  // Slugs rather than export names: the files are kebab-case, and a slug is
  // already the kebab form of the component this site documents.
  slugCache ??= [...coveredNames()].map((name) =>
    name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
  );
  return slugCache;
}

function isShown(demoId: string): boolean {
  return !COVERED_ELSEWHERE.has(demoId) && !documentedElsewhere(demoId, coveredSlugs());
}

// ─── items ────────────────────────────────────────────────────────────────────

export interface ShowcaseItem {
  /** Catalog entry id; also the detail route. */
  id: string;
  title: string;
  tier: Exclude<ShowcaseTier, "blocks">;
  /** The honest badge: catalog status, or `lab` for anything not graduated. */
  status: ShowcaseStatus;
  /** Catalog status underneath, for the detail page. */
  catalogStatus: CatalogEntry["status"];
  category: string;
  categoryId: string;
  import: CatalogEntry["import"];
  /** Demo the card renders, or null when none of the entry's demos can be mounted in a list. */
  demo: string | null;
  /** Every demo the entry has on this site. */
  demos: string[];
  variants: number;
  /** Natural size of `demo`, from the measured table. */
  natural: Natural | null;
  size: ReturnType<typeof sizeOf>;
  /** Why the card is an entry card with no live preview, when it is one for a reason other than size. */
  blocked: Blocked | null;
  /** For Lab: the graduation criteria still unmet. */
  gaps: GraduationCriterion[];
  audit: GraduationAudit | null;
}

const categoryTitle = new Map<string, string>(CATALOG_CATEGORIES.map((c) => [c.id, c.title]));
const categoryOrder = new Map<string, number>(CATALOG_CATEGORIES.map((c, i) => [c.id, i]));

const measured = sizes as Record<string, Natural>;

export function naturalSize(demoId: string): Natural | null {
  return measured[demoId] ?? null;
}

function toItem(entry: CatalogEntry): ShowcaseItem | null {
  const demos = entry.demos.filter(isShown);
  if (!demos.length) return null;

  const live = demos.find((id) => !BLOCKED[id]);
  const blocked = live ? null : (BLOCKED[demos[0] as string] ?? null);

  const audit = auditFor(entry.id);
  const tier = tierOf(entry, audit) as ShowcaseItem["tier"];
  const natural = live ? naturalSize(live) : null;

  return {
    id: entry.id,
    title: entry.title,
    tier,
    status: statusOf(tier, entry.status),
    catalogStatus: entry.status,
    category: categoryTitle.get(entry.category) ?? entry.category,
    categoryId: entry.category,
    import: entry.import,
    demo: live ?? null,
    demos,
    variants: demos.length,
    natural,
    size: live ? sizeOf(natural ?? undefined) : "entry",
    blocked,
    gaps: tier === "lab" ? graduationGaps(audit) : [],
    audit: tier === "lab" || tier === "expressive" ? audit : null,
  };
}

let itemCache: ShowcaseItem[] | null = null;

/** Every catalog entry the showcase carries, in tier, then catalog-category, then title order. */
export function showcaseItems(): ShowcaseItem[] {
  if (itemCache) return itemCache;
  itemCache = CATALOG.map(toItem)
    .filter((item): item is ShowcaseItem => item !== null)
    .sort(
      (a, b) =>
        (categoryOrder.get(a.categoryId) ?? 99) - (categoryOrder.get(b.categoryId) ?? 99) ||
        a.title.localeCompare(b.title),
    );
  return itemCache;
}

export function showcaseItem(id: string): ShowcaseItem | undefined {
  return showcaseItems().find((item) => item.id === id);
}

/** Demos that can be mounted, for the measuring route. */
export function liveDemoIds(): string[] {
  return showcaseItems().flatMap((item) => item.demos.filter((id) => !BLOCKED[id]));
}

export function blockedFor(demoId: string): Blocked | null {
  return BLOCKED[demoId] ?? null;
}

/**
 * One row per demo, for the site-wide palette. The palette used to link every
 * demo to `/showcase`; each now has a page of its own.
 */
export function showcaseDemos(): ShowcaseDemo[] {
  return showcaseItems()
    .flatMap((item) =>
      item.demos.map((id) => ({
        id,
        label: demoLabel(id),
        entry: item.id,
        href: `/showcase/${item.id}`,
      })),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Where a Core component named in a block lives on this site, when it lives anywhere. */
export function entryHref(entryId: string): string | null {
  if (COMPONENTS_BY_SLUG.has(entryId)) return `/components/${entryId}`;
  return showcaseItem(entryId) ? `/showcase/${entryId}` : null;
}

/** A block is as settled as the least settled thing it is made of. */
export function blockStatus(entryIds: readonly string[]): ShowcaseStatus {
  return entryIds.every((id) => catalogEntry(id)?.status === "stable") ? "stable" : "experimental";
}
