/**
 * Shared helpers for Refero → Brand Package compilation.
 * Preset builders live in compile-refero.ts; keep color/font extraction here.
 */

export type Json = Record<string, unknown>;

export type PresetId =
  | "linear"
  | "gsap"
  | "raycast"
  | "vercel"
  | "vanta"
  | "stripe"
  | "notion"
  | "generic";

export function leafHex(tree: Json | undefined, path: string[]): string | undefined {
  let cur: unknown = tree;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Json)[p];
  }
  if (!cur || typeof cur !== "object") return undefined;
  const v = (cur as Json).$value ?? (cur as Json).value;
  return typeof v === "string" ? v : undefined;
}

export function detectPreset(idHint: string, colors: Record<string, string>): PresetId {
  const id = idHint.toLowerCase();
  if (id.includes("linear")) return "linear";
  if (id.includes("gsap")) return "gsap";
  if (id.includes("raycast")) return "raycast";
  if (id.includes("vercel")) return "vercel";
  if (id.includes("vanta")) return "vanta";
  if (id.includes("stripe")) return "stripe";
  if (id.includes("notion")) return "notion";
  // Heuristics from Refero extractions
  if (colors["paper-white"] && colors.obsidian && colors.hairline) return "vercel";
  if (colors["coral-pulse"] || (colors["void-black"] && colors.mist && colors.ink)) {
    return "raycast";
  }
  if (colors["acid-lime"] || colors.void) return "linear";
  if (colors["shockingly-green"] || colors["surface-cream"] || colors["just-black"]) return "gsap";
  if (colors["just-black"] && colors["surface-cream"]) return "gsap";
  // Notion: warm paper canvas + single blue CTA + ink hierarchy
  if (
    (colors["notion-blue"] || colors["paper-warmth"]) &&
    (colors["paper-warmth"] || colors["ink-black"]) &&
    (colors["sky-tint"] || colors.marigold || colors.coral)
  ) {
    return "notion";
  }
  // Stripe: indigo-ink action + pure-white canvas + frost borders + midnight text
  if (
    colors["indigo-ink"] &&
    colors["pure-white"] &&
    (colors.frost || colors["lavender-border"] || colors["midnight-ink"]) &&
    !colors["paper-warmth"]
  ) {
    return "stripe";
  }
  // Vanta: indigo-ink as logo + vivid-violet CTA + parchment (not pure-white ledger)
  if (
    (colors["indigo-ink"] || colors["vivid-violet"]) &&
    (colors.parchment || colors["lavender-wash"] || colors.paper) &&
    !colors["pure-white"]
  ) {
    return "vanta";
  }
  return "generic";
}

/** First font family leaf that is UI/sans (not display/serif display faces). */
export function pickUiFontFamily(font: Json): string | undefined {
  const preferUi = /(inter|geist|manrope|dm sans|sans|ui)/i;
  const avoidDisplay = /(reckless|serif|display|editorial|playfair|lora|source serif)/i;
  const entries = Object.entries(font);
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") continue;
    const name = String((v as Json).$value ?? (v as Json).value ?? "");
    if (!name || avoidDisplay.test(k) || avoidDisplay.test(name)) continue;
    if (preferUi.test(k) || preferUi.test(name) || entries.length === 1) return name;
  }
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") continue;
    const name = String((v as Json).$value ?? (v as Json).value ?? "");
    if (name && !avoidDisplay.test(k) && !avoidDisplay.test(name)) return name;
  }
  return undefined;
}

export function pickDisplayFontFamily(font: Json): string | undefined {
  const prefer = /(reckless|serif|display|editorial|playfair|lora|source serif|mori)/i;
  for (const [k, v] of Object.entries(font)) {
    if (!v || typeof v !== "object") continue;
    const name = String((v as Json).$value ?? (v as Json).value ?? "");
    if (name && (prefer.test(k) || prefer.test(name))) return name;
  }
  return undefined;
}

/**
 * shadcn / Appearance / playground token names → keys generic + presets already pick.
 * Kebab and camel both land on the same slot so compileReferoTokens works for imports.
 */
const COLOR_KEY_ALIASES: Record<string, string[]> = {
  background: ["background", "canvas", "page-canvas"],
  foreground: ["foreground", "ink", "ink-black"],
  card: ["card", "card-surface", "surface"],
  "card-foreground": ["card-foreground"],
  cardForeground: ["card-foreground"],
  primary: ["primary", "action"],
  "primary-foreground": ["primary-foreground"],
  primaryForeground: ["primary-foreground"],
  secondary: ["secondary", "quiet"],
  "secondary-foreground": ["secondary-foreground"],
  secondaryForeground: ["secondary-foreground"],
  muted: ["muted"],
  "muted-foreground": ["muted-foreground", "mutedForeground", "stone"],
  mutedForeground: ["muted-foreground", "stone"],
  accent: ["accent"],
  "accent-foreground": ["accent-foreground"],
  accentForeground: ["accent-foreground"],
  border: ["border", "hairline"],
  input: ["input"],
  ring: ["ring"],
  destructive: ["destructive"],
  "destructive-foreground": ["destructive-foreground"],
  destructiveForeground: ["destructive-foreground"],
  success: ["success"],
  popover: ["popover"],
  "popover-foreground": ["popover-foreground"],
  popoverForeground: ["popover-foreground"],
};

function isUsableColorValue(val: string): boolean {
  const t = val.trim();
  if (!t) return false;
  if (t.startsWith("#")) return true;
  if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(t)) return true;
  if (/^hsla?\(/i.test(t) || /^rgba?\(/i.test(t)) return true;
  // oklch/lab left out of compile path (no reliable SSR convert); Appearance still has canvas probe
  return false;
}

export function collectColors(colorRoot: Json | undefined): Record<string, string> {
  const raw: Record<string, string> = {};
  if (!colorRoot || typeof colorRoot !== "object") return raw;
  for (const [k, v] of Object.entries(colorRoot)) {
    if (!v || typeof v !== "object") continue;
    const val = (v as Json).$value ?? (v as Json).value;
    if (typeof val === "string" && isUsableColorValue(val)) raw[k] = val.trim();
  }

  // Expand aliases so shadcn-named imports hit preset pick() keys
  const out: Record<string, string> = { ...raw };
  for (const [key, value] of Object.entries(raw)) {
    const aliases = COLOR_KEY_ALIASES[key];
    if (!aliases) continue;
    for (const alias of aliases) {
      if (!out[alias]) out[alias] = value;
    }
  }
  return out;
}

export function collectSurfaces(surfaceRoot: Json | undefined): Record<string, string> {
  return collectColors(surfaceRoot as Json | undefined);
}
