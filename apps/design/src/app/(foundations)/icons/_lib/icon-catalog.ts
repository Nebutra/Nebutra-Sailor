/**
 * The IconBox's brain: categories, search and the three things a click copies.
 *
 * Kept free of React so it can be tested, and kept honest about where its data
 * comes from. The Geist source ships no categories or keywords, so both are
 * derived here from the icon's own name — a rule per category, a short synonym
 * table for the words designers actually type. The test asserts every icon in
 * the package lands somewhere and that the catch-all stays a minority, so a
 * regenerated set that outgrows these rules fails loudly instead of silently
 * filling "Interface".
 */

export type CategoryId =
  | "arrows"
  | "files"
  | "media"
  | "data"
  | "status"
  | "people"
  | "platform"
  | "layout"
  | "brands"
  | "interface";

export const CATEGORIES: readonly { id: CategoryId; label: string }[] = [
  { id: "arrows", label: "Arrows & navigation" },
  { id: "files", label: "Code, files & AI" },
  { id: "media", label: "Media & imagery" },
  { id: "data", label: "Data, time & money" },
  { id: "status", label: "Status & feedback" },
  { id: "people", label: "People & messages" },
  { id: "platform", label: "Infrastructure & security" },
  { id: "layout", label: "Layout & text" },
  { id: "brands", label: "Brands & logos" },
  { id: "interface", label: "Interface" },
];

/** `ArrowUpRight` → `arrow-up-right`; digits stay with their word (`forward10-seconds`). */
export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

/** First match wins, so the order is part of the rule. Anything unmatched is "interface". */
const RULES: readonly [CategoryId, RegExp][] = [
  ["brands", /^(?:logo|browser)-|^(?:codepen|linkedin|postgres)$/u],
  [
    "media",
    /^(?:speaker|microphone|play|pause|stop(?!watch)|skip|rewind|forward|music|musical|video|webcam|camera|picture|shareplay|closed-captions|image|crop|droplet|blend|blob|prism|rainbow|spiral|preview)/u,
  ],
  [
    "files",
    /^(?:acronym|file|folder|code|git|branch|terminal|variable|api$|archive|notes|notebook|clipboard|scroll|bug|agent|agents|robot|brain|sparkles)/u,
  ],
  [
    "data",
    /^(?:chart|bar-chart|line-chart|analytics|gauge|data|percentage|calculator|delta|coins|dollar|credit-card|invoice|cart|store|stopwatch|clock|calendar|kv|cache|traces|logs|monitoring)/u,
  ],
  [
    "status",
    /^(?:check|cross|warning|information|question|status|bell|notification|face|thumb|heart|star|verified|loader|flag|lifebuoy|double-check)/u,
  ],
  [
    "people",
    /^(?:user|users|message|email|envelope|inbox|phone|headset|share|paper-airplane|paperclip|sign-in|logout)/u,
  ],
  [
    "platform",
    /^(?:lock|key|secure|fingerprint|shield|firewall|globe|cloud|servers|cpu|device|display|network|router|route|edge|serverless|middleware|microfrontends|fluid|sandbox|spaces|zero-config|workflow|hook|webhook|function|lambda|botid|canary|isr|vercel-agent|repositories|connection|power|tablet)/u,
  ],
  [
    "arrows",
    /^(?:arrow|chevron|corner|external|sort|compass|location|gps|crosshair|target|fullscreen|cursor)/u,
  ],
  ["layout", /^(?:text|alignment|layout|grid|sidebar|window|header|footer|tab|toolbar|list|menu)/u],
];

export function categoryOf(name: string): CategoryId {
  const slug = kebab(name);
  for (const [id, rule] of RULES) if (rule.test(slug)) return id;
  return "interface";
}

/**
 * What people type versus what the set calls it. Each word maps to name
 * fragments; a query word matches an icon if the word itself or any of its
 * fragments appears in the icon's kebab name.
 */
const SYNONYMS: Record<string, readonly string[]> = {
  add: ["plus"],
  back: ["arrow-left", "chevron-left"],
  chat: ["message"],
  close: ["cross"],
  collapse: ["chevron-up", "fullscreen-close"],
  dark: ["moon"],
  date: ["calendar"],
  delete: ["trash"],
  download: ["download"],
  edit: ["pen", "pencil"],
  error: ["cross-circle", "warning"],
  expand: ["chevron-down", "fullscreen"],
  hidden: ["eye-off"],
  home: ["home"],
  light: ["sun"],
  like: ["heart", "thumb-up"],
  loading: ["loader", "refresh"],
  mail: ["email", "envelope"],
  next: ["arrow-right", "chevron-right"],
  notification: ["bell"],
  password: ["key", "lock"],
  profile: ["user"],
  remove: ["trash", "minus"],
  save: ["floppy"],
  search: ["magnifying-glass"],
  settings: ["settings-gear", "settings-slider"],
  success: ["check"],
  theme: ["sun", "moon"],
  time: ["clock"],
  upload: ["upload"],
  visible: ["eye"],
};

/** Names matching every word of `query` (and, unless "all", the category), in input order. */
export function searchIcons(
  names: readonly string[],
  query: string,
  category: CategoryId | "all",
): string[] {
  const words = query
    .toLowerCase()
    .split(/[\s,]+/u)
    .filter(Boolean);

  return names.filter((name) => {
    if (category !== "all" && categoryOf(name) !== category) return false;
    const slug = kebab(name);
    const compact = slug.replaceAll("-", "");
    return words.every((word) => {
      const bare = word.replaceAll("-", "");
      if (slug.includes(word) || compact.includes(bare)) return true;
      return (SYNONYMS[word] ?? []).some((fragment) => slug.includes(fragment));
    });
  });
}

// ── what a click copies ─────────────────────────────────────────────────────

export interface IconStyle {
  /** px. 16 is the package default. */
  size: number;
  /** Outline thickening in the glyph's 16-unit space; 0 leaves the Geist drawing as shipped. */
  weight: number;
  tone: ToneId;
}

export type ToneId = "inherit" | "muted" | "primary" | "success" | "warning" | "danger";

/** Semantic text classes, so a copied snippet follows the theme instead of freezing a colour. */
export const TONES: readonly { id: ToneId; label: string; className: string | null }[] = [
  { id: "inherit", label: "Inherit", className: null },
  { id: "muted", label: "Muted", className: "text-muted-foreground" },
  { id: "primary", label: "Primary", className: "text-primary" },
  { id: "success", label: "Success", className: "text-success-strong" },
  { id: "warning", label: "Warning", className: "text-warning-strong" },
  { id: "danger", label: "Danger", className: "text-destructive-strong" },
];

export const DEFAULT_SIZE = 16;

export function importSnippet(name: string): string {
  return `import { ${name} } from "@nebutra/icons";`;
}

/**
 * The JSX element, with only the props that differ from the defaults. Weight is
 * an SVG stroke laid over the filled Geist glyph: `stroke="currentColor"` plus
 * `strokeWidth` thickens the drawing outward, which is why both appear together.
 */
export function jsxSnippet(name: string, style: IconStyle): string {
  const props: string[] = [];
  if (style.size !== DEFAULT_SIZE) props.push(`size={${style.size}}`);
  if (style.weight > 0) props.push('stroke="currentColor"', `strokeWidth={${style.weight}}`);
  const className = TONES.find((tone) => tone.id === style.tone)?.className;
  if (className) props.push(`className="${className}"`);
  return props.length === 0 ? `<${name} />` : `<${name} ${props.join(" ")} />`;
}

/**
 * Serialised `<svg>` (from `outerHTML`) → something worth pasting: no React
 * accessibility hint, no classes or inline styles that only mean something on
 * this page, one element per line, empty paths self-closed.
 */
export function tidySvg(markup: string): string {
  return markup
    .replace(/\s(?:aria-hidden|class|style)="[^"]*"/gu, "")
    .replace(
      /<(path|circle|rect|g|defs|clipPath|mask|ellipse|line|polygon|polyline)\b([^>]*)><\/\1>/gu,
      "<$1$2 />",
    )
    .replace(/>(?=<)/gu, ">\n")
    .replace(/^(<(?!\/|svg)[^\n]*)$/gmu, "  $1");
}
