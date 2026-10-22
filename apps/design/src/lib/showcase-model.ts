/**
 * The showcase's own taxonomy, as pure functions.
 *
 * The catalog groups components the way 21st.dev does (thirteen categories) and
 * marks each one stable or experimental. Neither is how a designer or an agent
 * decides what to reach for, so the showcase re-tiers the catalog:
 *
 *   core        - the quiet default. Primitives you compose every screen from.
 *   patterns    - multi-part compositions and page scaffolding.
 *   blocks      - authored here: real product scenes built from Core. Never derived.
 *   expressive  - motion and atmosphere that has earned a place (see GRADUATION).
 *   lab         - everything expressive that has not. Listed, never promoted.
 *
 * Nothing in this file touches the catalog, the filesystem or React, so the
 * rules can be tested without building the library.
 */

export type ShowcaseTier = "core" | "patterns" | "blocks" | "expressive" | "lab";

/** What the badge says. `lab` is a status of its own: it is not "experimental, but nearly". */
export type ShowcaseStatus = "stable" | "experimental" | "lab";

export type CatalogStatus = "stable" | "experimental";

export interface TierInput {
  id: string;
  /** Catalog category id. */
  category: string;
  status: CatalogStatus;
  /** Catalog import specifier, e.g. `@nebutra/ui/primitives`. */
  import: string;
}

export const TIERS: readonly { id: ShowcaseTier; title: string; blurb: string }[] = [
  {
    id: "core",
    title: "Core",
    blurb: "Primitives at their real size. The quiet default every screen is built from.",
  },
  {
    id: "patterns",
    title: "Patterns",
    blurb: "Multi-part compositions and page scaffolding, assembled from Core.",
  },
  {
    id: "blocks",
    title: "Blocks",
    blurb: "Real product scenes built from Core components, with the code to copy.",
  },
  {
    id: "expressive",
    title: "Expressive",
    blurb:
      "Motion and atmosphere that meets the bar: real consumers, tokens, reduced motion, a still fallback.",
  },
  {
    id: "lab",
    title: "Lab",
    blurb:
      "Effects that have not graduated. Shown so you can judge them, not so you can ship them.",
  },
];

/** Human label for a demo file: the base name with `-demo` removed. */
export function demoLabel(id: string): string {
  return id
    .replace(/-demo$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ─── tiers ────────────────────────────────────────────────────────────────────

/** Catalog categories whose entries are atmosphere or motion by nature. */
const EXPRESSIVE_CATEGORIES: ReadonlySet<string> = new Set(["effects", "text-motion", "media"]);

/**
 * Marketing-category entries that are decoration rather than a composition:
 * they exist to make a surface move or glow. The rest of `marketing` (pricing
 * card, feature card, announcement) is structure and stays in Patterns.
 */
const EXPRESSIVE_IDS: ReadonlySet<string> = new Set([
  "animated-hike-card",
  "card-spotlight",
  "infinite-slider",
  "kinetic-marketing",
  "magic-card",
  "scroll-velocity",
]);

const PATTERN_CATEGORIES: ReadonlySet<string> = new Set(["ai", "charts", "marketing"]);
const PATTERN_IMPORTS: ReadonlySet<string> = new Set([
  "@nebutra/ui/patterns",
  "@nebutra/ui/layout",
]);

export function isExpressiveKind(entry: Pick<TierInput, "id" | "category">): boolean {
  return EXPRESSIVE_CATEGORIES.has(entry.category) || EXPRESSIVE_IDS.has(entry.id);
}

/**
 * The bar for Expressive. Every item has to hold; one miss and the entry stays
 * in Lab, with the miss shown on its card.
 */
export const GRADUATION_CRITERIA = [
  "consumers",
  "tokens",
  "reducedMotion",
  "budget",
  "staticFallback",
] as const;

export type GraduationCriterion = (typeof GRADUATION_CRITERIA)[number];

export const MIN_CONSUMERS = 2;

/** `null` means nobody has checked, which is not the same as passing. */
export type Evidence = boolean | null;

export interface GraduationAudit {
  /** Colours, durations and easings come from tokens; no literal hex/rgb. */
  tokens: Evidence;
  /** `prefers-reduced-motion` is honoured (or there is no motion to honour). */
  reducedMotion: Evidence;
  /** Stays inside a stated cost: transform/opacity only, no canvas or WebGL loop. */
  budget: Evidence;
  /** Reduced motion, no JS, or a failed context all land on a designed still frame. */
  staticFallback: Evidence;
  /** Workspaces outside @nebutra/ui and this site that import it. */
  consumers: number;
  /** Where the evidence came from, so the next reader can redo it. */
  note: string;
}

export const GRADUATION_LABELS: Record<GraduationCriterion, { label: string; rule: string }> = {
  consumers: {
    label: "Real consumers",
    rule: `Imported by at least ${MIN_CONSUMERS} apps or packages outside the library.`,
  },
  tokens: { label: "Tokenised", rule: "Colour, duration and easing come from tokens." },
  reducedMotion: { label: "Reduced motion", rule: "prefers-reduced-motion is honoured." },
  budget: {
    label: "Performance budget",
    rule: "Transform and opacity only; no canvas or WebGL loop.",
  },
  staticFallback: {
    label: "Static fallback",
    rule: "Reduced motion or a failed effect lands on a designed still frame.",
  },
};

/**
 * Evidence for the entries that have been read, as of 2026-10-22.
 *
 * `consumers` is a name-grep across apps/** and packages/** excluding
 * @nebutra/ui, this site, stories and tests; treat it as +-1. The other four
 * were checked by reading the source, and only the entries listed here were
 * read. An entry that is absent is unaudited: every criterion is `null`, so it
 * stays in Lab.
 *
 * When a Lab entry gets its second real consumer, record it here and `tierOf`
 * moves it; nothing else changes.
 */
export const EXPRESSIVE_AUDIT: Record<string, GraduationAudit> = {
  "animate-in": {
    tokens: true,
    reducedMotion: true,
    budget: true,
    staticFallback: true,
    consumers: 5,
    note: "Presets come from @nebutra/brand; reduced motion falls back to a 0.15s fade; transform and opacity only. Used by landing, router, web, para, design-sync.",
  },
  "aurora-background": {
    tokens: true,
    reducedMotion: true,
    budget: true,
    staticFallback: true,
    consumers: 2,
    note: "Static gradient layers coloured from the primary token and the neutral/blue scales; nothing animates. Used by landing and forge.",
  },
  "dot-pattern": {
    tokens: true,
    reducedMotion: true,
    budget: null,
    staticFallback: true,
    consumers: 1,
    note: "currentColor dots; glow is skipped under reduced motion. One SVG node per dot, so the cost has not been bounded. Used by web only.",
  },
  "infinite-slider": {
    tokens: true,
    reducedMotion: true,
    budget: null,
    staticFallback: true,
    consumers: 1,
    note: "Parks at offset 0 under reduced motion. Long-running cost not measured. Used by landing only.",
  },
  "animated-beam": {
    tokens: true,
    reducedMotion: true,
    budget: null,
    staticFallback: null,
    consumers: 1,
    note: "Tone colours come from its component token; honours useReducedMotion. Still frame not checked. Used by landing only.",
  },
};

const UNAUDITED: GraduationAudit = {
  tokens: null,
  reducedMotion: null,
  budget: null,
  staticFallback: null,
  consumers: 0,
  note: "Not audited.",
};

export function auditFor(id: string): GraduationAudit {
  return EXPRESSIVE_AUDIT[id] ?? UNAUDITED;
}

/** The criteria an entry does not yet meet. `null` evidence counts as unmet. */
export function graduationGaps(audit: GraduationAudit | undefined): GraduationCriterion[] {
  const a = audit ?? UNAUDITED;
  return GRADUATION_CRITERIA.filter((criterion) =>
    criterion === "consumers" ? a.consumers < MIN_CONSUMERS : a[criterion] !== true,
  );
}

export function tierOf(entry: TierInput, audit?: GraduationAudit): ShowcaseTier {
  if (isExpressiveKind(entry)) {
    const graduates = entry.status === "stable" && graduationGaps(audit).length === 0;
    return graduates ? "expressive" : "lab";
  }
  if (PATTERN_CATEGORIES.has(entry.category) || PATTERN_IMPORTS.has(entry.import)) {
    return "patterns";
  }
  return "core";
}

export function statusOf(tier: ShowcaseTier, status: CatalogStatus): ShowcaseStatus {
  return tier === "lab" ? "lab" : status;
}

// ─── sizes ────────────────────────────────────────────────────────────────────

/**
 * Cards hold a demo at 1:1 and never scale it. A demo is banded by the size it
 * lays out at (measured by `scripts/measure-showcase.mjs` into
 * `showcase-sizes.generated.json`); one that fits no band is an entry card with
 * a link to its detail page, not a smaller picture of itself.
 */
export type CardSize = "S" | "M" | "L" | "entry";

export interface Natural {
  w: number;
  h: number;
}

/** Content box of each band, in CSS px. The card adds `CARD_PAD` on each side. */
export const SIZE_LIMITS = {
  S: { w: 248, h: 184 },
  M: { w: 400, h: 300 },
  L: { w: 800, h: 460 },
} as const;

export const CARD_PAD = 16;

export function sizeOf(natural: Natural | undefined): CardSize {
  if (!natural) return "entry";
  for (const band of ["S", "M", "L"] as const) {
    const limit = SIZE_LIMITS[band];
    if (natural.w <= limit.w && natural.h <= limit.h) return band;
  }
  return "entry";
}

/**
 * Card widths a demo may be asked to fit in. The container-query classes that
 * hide a demo in a card too narrow for it have to be literal strings for
 * Tailwind, so the needed width is rounded up to one of these.
 */
export const WIDTH_STEPS = [
  200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640, 720, 800, 880,
] as const;

export function widthStep(naturalWidth: number): number {
  const need = naturalWidth + CARD_PAD * 2;
  return WIDTH_STEPS.find((step) => step >= need) ?? 880;
}

// ─── filtering ────────────────────────────────────────────────────────────────

export interface CardItem {
  id: string;
  title: string;
  tier: ShowcaseTier;
  status: ShowcaseStatus;
  /** Display name of the catalog category (or the block's product). */
  category: string;
}

export interface ShowcaseFilter {
  tier: ShowcaseTier | "all";
  status: ShowcaseStatus | "all";
  query: string;
}

export function filterItems<T extends CardItem>(items: readonly T[], filter: ShowcaseFilter): T[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter.tier !== "all" && item.tier !== filter.tier) return false;
    if (filter.status !== "all" && item.status !== filter.status) return false;
    if (!words.length) return true;
    const haystack = `${item.title} ${item.id} ${item.category}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
