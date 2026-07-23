import { emitBrandCss } from "./emit-css";
import { tryHexToHsl } from "./hex-to-hsl";
import { inferRecipeFromDesignMd } from "./infer-recipe";
import { normalizeBrandPackage } from "./normalize";
import type {
  BrandPackage,
  BrandRecipe,
  ButtonDefaultStyle,
  CompileResult,
  Density,
} from "./types";

function finish(brand: BrandPackage, warnings: string[]): CompileResult {
  const b = normalizeBrandPackage(brand);
  return { brand: b, css: emitBrandCss(b), warnings };
}

type Json = Record<string, unknown>;

function leafHex(tree: Json | undefined, path: string[]): string | undefined {
  let cur: unknown = tree;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Json)[p];
  }
  if (!cur || typeof cur !== "object") return undefined;
  const v = (cur as Json).$value ?? (cur as Json).value;
  return typeof v === "string" ? v : undefined;
}

function detectPreset(
  idHint: string,
  colors: Record<string, string>,
): "linear" | "gsap" | "raycast" | "vercel" | "vanta" | "stripe" | "notion" | "generic" {
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
function pickUiFontFamily(font: Json): string | undefined {
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

function pickDisplayFontFamily(font: Json): string | undefined {
  const prefer = /(reckless|serif|display|editorial|playfair|lora|source serif|mori)/i;
  for (const [k, v] of Object.entries(font)) {
    if (!v || typeof v !== "object") continue;
    const name = String((v as Json).$value ?? (v as Json).value ?? "");
    if (name && (prefer.test(k) || prefer.test(name))) return name;
  }
  return undefined;
}

function collectColors(colorRoot: Json | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!colorRoot || typeof colorRoot !== "object") return out;
  for (const [k, v] of Object.entries(colorRoot)) {
    if (!v || typeof v !== "object") continue;
    const val = (v as Json).$value ?? (v as Json).value;
    if (typeof val === "string" && val.startsWith("#")) out[k] = val;
  }
  return out;
}

function collectSurfaces(surfaceRoot: Json | undefined): Record<string, string> {
  return collectColors(surfaceRoot as Json | undefined);
}

/**
 * Compile a Refero-style DTCG tokens.json (+ optional DESIGN.md text) into a Brand Package.
 * Known fixtures (Linear / GSAP) get opinionated recipes; generic brands get solid CTAs.
 */
export function compileReferoTokens(input: {
  tokens: Json;
  id?: string;
  name?: string;
  designMd?: string;
}): CompileResult {
  const warnings: string[] = [];
  const color = (input.tokens.color ?? {}) as Json;
  const surface = (input.tokens.surface ?? {}) as Json;
  const font = (input.tokens.font ?? {}) as Json;
  const radius = (input.tokens.radius ?? {}) as Json;
  const ext = (input.tokens.$extensions ?? {}) as Json;
  const refero = (ext["com.refero.extraction"] ?? {}) as Json;

  const colors = { ...collectColors(color), ...collectSurfaces(surface) };
  const siteName =
    (typeof refero.siteName === "string" && refero.siteName) || input.name || "Custom Brand";
  const id =
    input.id ||
    siteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "custom";

  const preset = detectPreset(id, colors);
  const designMdRaw = input.designMd ?? "";
  const recipeHints = inferRecipeFromDesignMd(designMdRaw);

  // ── Linear fixture ──────────────────────────────────────────────
  if (preset === "linear") {
    const voidC = colors.void ?? colors["just-black"] ?? "#08090a";
    const carbon = colors.carbon ?? "#0f1011";
    const graphite = colors.graphite ?? "#23252a";
    const ash = colors.ash ?? "#62666d";
    const paper = colors.paper ?? "#ffffff";
    const lime = colors["acid-lime"] ?? "#e4f222";
    const coral = colors["coral-red"] ?? "#eb5757";
    const pulse = colors["pulse-green"] ?? "#27a644";

    const brand: BrandPackage = {
      id: "linear",
      name: "Linear",
      darkDefault: true,
      version: "1.0.0",
      semantic: {
        background: tryHexToHsl(voidC, "210 11% 4%"),
        foreground: tryHexToHsl(paper, "0 0% 100%"),
        card: tryHexToHsl(carbon, "210 6% 6%"),
        cardForeground: tryHexToHsl(paper, "0 0% 100%"),
        popover: tryHexToHsl(colors.obsidian ?? "#161718", "210 5% 9%"),
        popoverForeground: tryHexToHsl(paper, "0 0% 100%"),
        primary: tryHexToHsl(lime, "66 89% 54%"),
        primaryForeground: tryHexToHsl(voidC, "210 11% 4%"),
        secondary: tryHexToHsl(graphite, "220 7% 15%"),
        secondaryForeground: tryHexToHsl(colors.mist ?? "#d0d6e0", "220 20% 85%"),
        muted: tryHexToHsl(colors.obsidian ?? "#161718", "210 5% 9%"),
        mutedForeground: tryHexToHsl(ash, "220 5% 41%"),
        accent: tryHexToHsl(graphite, "220 7% 15%"),
        accentForeground: tryHexToHsl(lime, "66 89% 54%"),
        destructive: tryHexToHsl(coral, "0 79% 63%"),
        destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
        border: tryHexToHsl(graphite, "220 7% 15%"),
        input: tryHexToHsl(graphite, "220 7% 15%"),
        ring: tryHexToHsl(lime, "66 89% 54%"),
        success: tryHexToHsl(pulse, "136 61% 40%"),
        successForeground: tryHexToHsl(paper, "0 0% 100%"),
        info: tryHexToHsl(colors["signal-teal"] ?? "#02b8cc", "187 98% 40%"),
        infoForeground: tryHexToHsl(paper, "0 0% 100%"),
      },
      recipe: {
        buttonDefault: "solid",
        buttonRadius: "6px",
        cardRadius: "12px",
        elevation: "soft",
        density: "compact",
      },
      typography: {
        fontSans: `'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif`,
        fontMono: `'Berkeley Mono', 'JetBrains Mono', ui-monospace, monospace`,
        headingWeight: 510,
        // Create Center can replace faces[].src with hosted WOFF2 URLs
        faces: [
          {
            family: "Inter Variable",
            src: [
              {
                url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
                format: "woff2",
              },
            ],
            weight: "100 900",
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: { fontSize: "13px", lineHeight: 1.2, fontWeight: 400 },
          bodySm: { fontSize: "14px", lineHeight: 1.5, fontWeight: 400 },
          body: { fontSize: "14px", lineHeight: 1.5, fontWeight: 400 },
          bodyLg: { fontSize: "16px", lineHeight: 1.5, fontWeight: 400 },
          heading: {
            fontSize: "24px",
            lineHeight: 1.25,
            fontWeight: 510,
            letterSpacing: "-0.012em",
          },
          display: {
            fontSize: "32px",
            lineHeight: 1.15,
            fontWeight: 510,
            letterSpacing: "-0.022em",
          },
        },
        marketing: {
          body: { fontSize: "15px", lineHeight: 1.6, fontWeight: 400 },
          heading: {
            fontSize: "48px",
            lineHeight: 1,
            fontWeight: 510,
            letterSpacing: "-0.022em",
          },
          display: {
            fontSize: "72px",
            lineHeight: 1,
            fontWeight: 510,
            letterSpacing: "-0.022em",
          },
        },
      },
      extensions: {
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://linear.app",
        notes: ["Solid acid-lime CTA; product chrome only."],
      },
    };
    return finish(brand, warnings);
  }

  // ── GSAP fixture ────────────────────────────────────────────────
  if (preset === "gsap") {
    const canvas = colors["just-black"] ?? colors.canvas ?? "#0e100f";
    const cream = colors["surface-cream"] ?? colors["cream-surface"] ?? "#fffce1";
    const muted = colors["surface-50"] ?? "#7c7c6f";
    const hairline = colors["surface-25"] ?? "#42433d";
    const nested = colors["off-black"] ?? colors["nested-panel"] ?? "#191919";
    const green = colors["shockingly-green"] ?? "#0ae448";
    // DESIGN: do NOT promote shockingly-green to filled primary CTA
    warnings.push(
      "GSAP: shockingly-green is accent/link only — buttonDefault=outline (no solid green fill).",
    );

    const buttonDefault: ButtonDefaultStyle = recipeHints.buttonDefault ?? "gradient-stroke";

    const brand: BrandPackage = {
      id: "gsap",
      name: "GSAP",
      darkDefault: true,
      version: "1.0.0",
      semantic: {
        // Primary for *links/accents* — filled solid CTAs are disabled by recipe
        background: tryHexToHsl(canvas, "150 8% 6%"),
        foreground: tryHexToHsl(cream, "54 100% 94%"),
        card: tryHexToHsl(nested, "0 0% 10%"),
        cardForeground: tryHexToHsl(cream, "54 100% 94%"),
        popover: tryHexToHsl(nested, "0 0% 10%"),
        popoverForeground: tryHexToHsl(cream, "54 100% 94%"),
        primary: tryHexToHsl(green, "136 91% 47%"),
        primaryForeground: tryHexToHsl(canvas, "150 8% 6%"),
        secondary: tryHexToHsl(hairline, "60 5% 25%"),
        secondaryForeground: tryHexToHsl(cream, "54 100% 94%"),
        muted: tryHexToHsl(nested, "0 0% 10%"),
        mutedForeground: tryHexToHsl(muted, "60 6% 46%"),
        accent: tryHexToHsl(hairline, "60 5% 25%"),
        accentForeground: tryHexToHsl(green, "136 91% 47%"),
        destructive: tryHexToHsl(colors["lipstick-pink"] ?? "#f100cb", "310 100% 47%"),
        destructiveForeground: tryHexToHsl(cream, "54 100% 94%"),
        border: tryHexToHsl(hairline, "60 5% 25%"),
        input: tryHexToHsl(hairline, "60 5% 25%"),
        ring: tryHexToHsl(green, "136 91% 47%"),
        info: tryHexToHsl(colors.blue ?? "#00bae2", "191 100% 44%"),
        infoForeground: tryHexToHsl(canvas, "150 8% 6%"),
        success: tryHexToHsl(green, "136 91% 47%"),
        successForeground: tryHexToHsl(canvas, "150 8% 6%"),
      },
      recipe: {
        buttonDefault,
        buttonRadius: recipeHints.buttonRadius ?? leafHex(radius, ["full"]) ?? "100px",
        cardRadius: leafHex(radius, ["lg"]) ?? "8px",
        elevation: recipeHints.elevation ?? "none",
        density: (recipeHints.density ?? "comfortable") satisfies Density,
        outlineBorder: cream,
        primaryStrokeGradient: "linear-gradient(114.41deg, #0ae448 20.74%, #abff84 65.5%)",
      },
      typography: {
        fontSans: `'Mori', 'Inter Tight', 'DM Sans', ui-sans-serif, system-ui, sans-serif`,
        fontDisplay: `'Mori', 'Inter Tight', ui-sans-serif, system-ui, sans-serif`,
        headingWeight: 600,
        faces: [
          {
            family: "Mori",
            // Placeholder — Create Center replaces with tenant-uploaded WOFF2
            src: [{ url: "/brand-assets/mori-regular.woff2", format: "woff2" }],
            weight: 400,
            display: "swap",
          },
          {
            family: "Mori",
            src: [{ url: "/brand-assets/mori-semibold.woff2", format: "woff2" }],
            weight: 600,
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: { fontSize: "14px", lineHeight: 1.4, fontWeight: 400, letterSpacing: "-0.14px" },
          bodySm: { fontSize: "16px", lineHeight: 1.15, fontWeight: 400 },
          body: { fontSize: "19px", lineHeight: 1.15, fontWeight: 400 },
          bodyLg: { fontSize: "23px", lineHeight: 1.38, fontWeight: 400, letterSpacing: "-0.23px" },
          subheading: {
            fontSize: "34px",
            lineHeight: 1.2,
            fontWeight: 400,
            letterSpacing: "-0.34px",
          },
          heading: {
            fontSize: "44px",
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: "-0.44px",
          },
        },
        marketing: {
          body: { fontSize: "19px", lineHeight: 1.15, fontWeight: 400 },
          heading: {
            fontSize: "66px",
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: "-0.66px",
          },
          headingLg: {
            fontSize: "101px",
            lineHeight: 1,
            fontWeight: 600,
            letterSpacing: "-1.11px",
          },
          display: {
            fontSize: "224px",
            lineHeight: 0.9,
            fontWeight: 600,
            letterSpacing: "-4.48px",
          },
        },
      },
      extensions: {
        categories: {
          gsap: green,
          scroll: colors.pink ?? "#fec5fb",
          svg: colors.orangey ?? "#ff8709",
          text: colors.lilac ?? "#9d95ff",
          ui: colors.blue ?? "#00bae2",
          other: colors["light-green"] ?? "#abff84",
        },
        displaySizePx: 224,
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://gsap.com",
        notes: [
          "Outline-first product controls; category colors are marketing extensions.",
          "Replace typography.faces[].src with Create Center hosted font URLs.",
          'Use data-zone="marketing" for hero/display; product zone for app chrome.',
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Raycast fixture ─────────────────────────────────────────────
  // Neutral Mist filled CTA + Iron text; Coral is brand-only (never product CTA).
  if (preset === "raycast") {
    const canvas = colors["void-black"] ?? colors.canvas ?? "#040506";
    const ink = colors.ink ?? colors.card ?? "#07080a";
    const obsidian = colors.obsidian ?? colors.recessed ?? "#111214";
    const graphite = colors.graphite ?? colors.badge ?? "#1b1c1e";
    const smoke = colors.smoke ?? "#6a6b6c";
    const ash = colors.ash ?? "#9c9c9d";
    const mist = colors.mist ?? "#e6e6e6";
    const iron = colors.iron ?? "#454647";
    const slate = colors.slate ?? "#2f3031";
    const paper = colors["pure-white"] ?? "#ffffff";
    const coral = colors["coral-pulse"] ?? "#ff6363";
    const success = colors["success-green"] ?? "#59d499";
    const info = colors["info-blue"] ?? "#56c2ff";

    warnings.push(
      "Raycast: coral-pulse is brand mark only — primary CTA is Mist/Iron neutral solid.",
    );

    const brand: BrandPackage = {
      id: "raycast",
      name: "Raycast",
      darkDefault: true,
      version: "1.0.0",
      semantic: {
        background: tryHexToHsl(canvas, "210 20% 2%"),
        foreground: tryHexToHsl(paper, "0 0% 100%"),
        card: tryHexToHsl(ink, "220 18% 3%"),
        cardForeground: tryHexToHsl(paper, "0 0% 100%"),
        popover: tryHexToHsl(ink, "220 18% 3%"),
        popoverForeground: tryHexToHsl(paper, "0 0% 100%"),
        // Filled CTA = Mist on dark (not coral)
        primary: tryHexToHsl(mist, "0 0% 90%"),
        primaryForeground: tryHexToHsl(iron, "210 1% 27%"),
        secondary: tryHexToHsl(graphite, "220 4% 11%"),
        secondaryForeground: tryHexToHsl(paper, "0 0% 100%"),
        muted: tryHexToHsl(obsidian, "220 6% 7%"),
        mutedForeground: tryHexToHsl(smoke, "240 1% 42%"),
        // Coral as accent for brand-adjacent UI (badges that opt-in to accent)
        accent: tryHexToHsl(coral, "0 100% 69%"),
        accentForeground: tryHexToHsl(paper, "0 0% 100%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
        border: tryHexToHsl(slate, "210 2% 19%"),
        input: tryHexToHsl(obsidian, "220 6% 7%"),
        ring: tryHexToHsl(ash, "240 1% 61%"),
        success: tryHexToHsl(success, "150 58% 59%"),
        successForeground: tryHexToHsl(canvas, "210 20% 2%"),
        info: tryHexToHsl(info, "200 100% 67%"),
        infoForeground: tryHexToHsl(canvas, "210 20% 2%"),
      },
      recipe: {
        buttonDefault: "solid",
        buttonRadius: recipeHints.buttonRadius ?? "8px",
        cardRadius: "16px",
        elevation: recipeHints.elevation ?? "key",
        density: recipeHints.density ?? "comfortable",
        badgeDefault: "muted",
        badgeRadius: "6px",
        inputRadius: "8px",
      },
      typography: {
        fontSans: `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`,
        fontMono: `'Geist Mono', 'GeistMono', ui-monospace, Menlo, monospace`,
        fontDisplay: `'Inter', ui-sans-serif, system-ui, sans-serif`,
        headingWeight: 400,
        faces: [
          {
            family: "Inter",
            src: [
              {
                url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
                format: "woff2",
              },
            ],
            weight: "100 900",
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: {
            fontSize: "11px",
            lineHeight: 0.91,
            fontWeight: 500,
            letterSpacing: "0.8px",
          },
          bodySm: { fontSize: "13px", lineHeight: 1.2, fontWeight: 500 },
          body: { fontSize: "16px", lineHeight: 1.15, fontWeight: 400 },
          bodyLg: { fontSize: "18px", lineHeight: 1.15, fontWeight: 400 },
          subheading: {
            fontSize: "20px",
            lineHeight: 1.2,
            fontWeight: 400,
            letterSpacing: "0.2px",
          },
          headingSm: { fontSize: "24px", lineHeight: 1.15, fontWeight: 500 },
          heading: { fontSize: "32px", lineHeight: 1.15, fontWeight: 500 },
        },
        marketing: {
          body: { fontSize: "16px", lineHeight: 1.15, fontWeight: 400 },
          heading: { fontSize: "32px", lineHeight: 1.15, fontWeight: 500 },
          headingLg: {
            fontSize: "56px",
            lineHeight: 1.17,
            fontWeight: 400,
            letterSpacing: "0.22px",
          },
          display: { fontSize: "64px", lineHeight: 1.1, fontWeight: 600 },
        },
      },
      extensions: {
        categories: {
          brand: coral,
          ember: colors["ember-hush"] ?? "#452324",
          sky: colors["electric-sky"] ?? "#63a1ff",
        },
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://raycast.com",
        notes: [
          "Primary CTA = Mist fill + Iron text (neutral solid).",
          "Coral Pulse is brand mark only — do not use for general product chrome CTAs.",
          "Cards use elevation=key (keyboard-key inset shadow stack).",
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Vercel fixture ──────────────────────────────────────────────
  // Light monochrome: paper canvas, Obsidian filled CTA, hairline elevation.
  if (preset === "vercel") {
    const paper = colors["paper-white"] ?? colors["page-canvas"] ?? "#fafafa";
    const pure = colors["pure-white"] ?? colors["card-surface"] ?? "#ffffff";
    const hairline = colors.hairline ?? "#ebebeb";
    const charcoal = colors.charcoal ?? "#4d4d4d";
    const stone = colors.stone ?? "#666666";
    const obsidian = colors.obsidian ?? colors["inverted-surface"] ?? "#171717";
    const carbon = colors.carbon ?? "#000000";
    const terminal = colors["terminal-green"] ?? "#297a3a";

    warnings.push(
      "Vercel: monochrome light system — no chromatic CTA; Terminal Green is support only.",
    );

    const brand: BrandPackage = {
      id: "vercel",
      name: "Vercel",
      darkDefault: false,
      version: "1.0.0",
      semantic: {
        background: tryHexToHsl(paper, "0 0% 98%"),
        foreground: tryHexToHsl(obsidian, "0 0% 9%"),
        card: tryHexToHsl(pure, "0 0% 100%"),
        cardForeground: tryHexToHsl(obsidian, "0 0% 9%"),
        popover: tryHexToHsl(pure, "0 0% 100%"),
        popoverForeground: tryHexToHsl(obsidian, "0 0% 9%"),
        // Filled black button
        primary: tryHexToHsl(obsidian, "0 0% 9%"),
        primaryForeground: tryHexToHsl(pure, "0 0% 100%"),
        secondary: tryHexToHsl(hairline, "0 0% 92%"),
        secondaryForeground: tryHexToHsl(charcoal, "0 0% 30%"),
        muted: tryHexToHsl(hairline, "0 0% 92%"),
        mutedForeground: tryHexToHsl(stone, "0 0% 40%"),
        accent: tryHexToHsl(hairline, "0 0% 92%"),
        accentForeground: tryHexToHsl(obsidian, "0 0% 9%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(pure, "0 0% 100%"),
        border: tryHexToHsl(hairline, "0 0% 92%"),
        input: tryHexToHsl(pure, "0 0% 100%"),
        ring: tryHexToHsl(obsidian, "0 0% 9%"),
        success: tryHexToHsl(terminal, "133 49% 32%"),
        successForeground: tryHexToHsl(pure, "0 0% 100%"),
        info: tryHexToHsl(charcoal, "0 0% 30%"),
        infoForeground: tryHexToHsl(pure, "0 0% 100%"),
      },
      recipe: {
        buttonDefault: "solid",
        buttonRadius: recipeHints.buttonRadius ?? "6px",
        cardRadius: "6px",
        elevation:
          recipeHints.elevation === "key" ? "hairline" : (recipeHints.elevation ?? "hairline"),
        density: recipeHints.density ?? "compact",
        badgeDefault: "muted",
        badgeRadius: "6px",
        inputRadius: "6px",
        cardShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgb(250, 250, 250) 0px 0px 0px 1px",
        outlineBorder: hairline,
      },
      typography: {
        fontSans: `'Geist Sans', 'Geist', ui-sans-serif, system-ui, sans-serif`,
        fontMono: `'Geist Mono', ui-monospace, Menlo, monospace`,
        fontDisplay: `'Geist Sans', 'Geist', ui-sans-serif, system-ui, sans-serif`,
        headingWeight: 450,
        faces: [
          {
            family: "Geist Sans",
            src: [
              {
                url: "https://cdn.jsdelivr.net/fontsource/fonts/geist-sans:vf@latest/latin-wght-normal.woff2",
                format: "woff2",
              },
            ],
            weight: "100 900",
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: { fontSize: "13px", lineHeight: 1.54, fontWeight: 400 },
          bodySm: { fontSize: "14px", lineHeight: 1.43, fontWeight: 400 },
          body: { fontSize: "16px", lineHeight: 1.5, fontWeight: 400 },
          heading: {
            fontSize: "30px",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-1.5px",
          },
        },
        marketing: {
          body: { fontSize: "16px", lineHeight: 1.5, fontWeight: 400 },
          heading: {
            fontSize: "30px",
            lineHeight: 1.1,
            fontWeight: 450,
            letterSpacing: "-1.5px",
          },
          headingLg: {
            fontSize: "56px",
            lineHeight: 1,
            fontWeight: 450,
            letterSpacing: "-3.36px",
          },
          display: {
            fontSize: "64px",
            lineHeight: 1,
            fontWeight: 450,
            letterSpacing: "-3.84px",
          },
        },
      },
      extensions: {
        categories: {
          carbon: carbon,
          terminal: terminal,
        },
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://vercel.com",
        notes: [
          "Light monochrome — primary CTA is Obsidian fill + white text.",
          "Elevation is hairline double-ring, never drop-shadow.",
          "Spectrum/solar gradients are marketing-only decorative (not product chrome).",
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Notion fixture ──────────────────────────────────────────────
  // Warm paper canvas (#f6f5f4), pure-white cards, single Notion Blue CTA,
  // ink-black brand/text hierarchy, 8px buttons / 12px cards, elev=none + hairline.
  if (preset === "notion") {
    const paper = colors["paper-warmth"] ?? "#f6f5f4";
    const white = colors["pure-white"] ?? "#ffffff";
    const ink = colors["ink-black"] ?? "#000000";
    const charcoal = colors.charcoal ?? "#111111";
    const stone = colors.stone ?? "#757575";
    const graphite = colors.graphite ?? "#615d59";
    const blue = colors["notion-blue"] ?? "#0075de";
    const sky = colors["sky-tint"] ?? "#e6f3fe";
    const marigold = colors.marigold ?? "#ffb110";
    const coral = colors.coral ?? "#f64932";
    const midnight = colors["midnight-ink"] ?? "#02093a";
    const signal = colors["signal-blue"] ?? "#097fe8";

    warnings.push(
      "Notion: notion-blue is the only filled CTA; marigold/coral/midnight are decorative card washes (never default action).",
    );
    warnings.push(
      "Notion: content cards use 1px hairline + elev=none; soft shadows only for sticky nav / product mockups (raised slot).",
    );

    const brand: BrandPackage = {
      id: "notion",
      name: "Notion",
      darkDefault: false,
      version: "1.0.0",
      roles: {
        canvas: tryHexToHsl(paper, "30 9% 96%"),
        canvasForeground: tryHexToHsl(ink, "0 0% 0%"),
        surface: tryHexToHsl(white, "0 0% 100%"),
        surfaceForeground: tryHexToHsl(ink, "0 0% 0%"),
        action: tryHexToHsl(blue, "208 100% 44%"),
        actionForeground: tryHexToHsl(white, "0 0% 100%"),
        // Logo / wordmark / ink hierarchy — not blue CTA
        brand: tryHexToHsl(ink, "0 0% 0%"),
        brandForeground: tryHexToHsl(white, "0 0% 100%"),
        // Ghost CTA wash
        quiet: tryHexToHsl(sky, "206 90% 95%"),
        quietForeground: tryHexToHsl(blue, "208 100% 44%"),
        muted: tryHexToHsl(sky, "206 90% 95%"),
        mutedForeground: tryHexToHsl(stone, "0 0% 46%"),
        // Approx hairline rgba(0,0,0,0.08) on warm paper
        border: "30 5% 88%",
        input: tryHexToHsl(white, "0 0% 100%"),
        ring: tryHexToHsl(blue, "208 100% 44%"),
        destructive: tryHexToHsl(coral, "6 91% 58%"),
        destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
        warning: tryHexToHsl(marigold, "40 100% 53%"),
        warningForeground: tryHexToHsl(ink, "0 0% 0%"),
        info: tryHexToHsl(signal, "207 93% 47%"),
        infoForeground: tryHexToHsl(white, "0 0% 100%"),
      },
      semantic: {
        background: tryHexToHsl(paper, "30 9% 96%"),
        foreground: tryHexToHsl(ink, "0 0% 0%"),
        card: tryHexToHsl(white, "0 0% 100%"),
        cardForeground: tryHexToHsl(ink, "0 0% 0%"),
        popover: tryHexToHsl(white, "0 0% 100%"),
        popoverForeground: tryHexToHsl(ink, "0 0% 0%"),
        primary: tryHexToHsl(blue, "208 100% 44%"),
        primaryForeground: tryHexToHsl(white, "0 0% 100%"),
        secondary: tryHexToHsl(sky, "206 90% 95%"),
        secondaryForeground: tryHexToHsl(blue, "208 100% 44%"),
        muted: tryHexToHsl(sky, "206 90% 95%"),
        mutedForeground: tryHexToHsl(stone, "0 0% 46%"),
        accent: tryHexToHsl(sky, "206 90% 95%"),
        accentForeground: tryHexToHsl(blue, "208 100% 44%"),
        destructive: tryHexToHsl(coral, "6 91% 58%"),
        destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
        border: "30 5% 88%",
        input: tryHexToHsl(white, "0 0% 100%"),
        ring: tryHexToHsl(blue, "208 100% 44%"),
        warning: tryHexToHsl(marigold, "40 100% 53%"),
        warningForeground: tryHexToHsl(ink, "0 0% 0%"),
        info: tryHexToHsl(signal, "207 93% 47%"),
        infoForeground: tryHexToHsl(white, "0 0% 100%"),
      },
      recipe: {
        buttonDefault: recipeHints.buttonDefault ?? "solid",
        buttonRadius:
          recipeHints.buttonRadius ??
          leafHex(radius, ["buttons"]) ??
          leafHex(radius, ["lg"]) ??
          "8px",
        cardRadius:
          recipeHints.cardRadius ?? leafHex(radius, ["cards"]) ?? leafHex(radius, ["xl"]) ?? "12px",
        badgeRadius: leafHex(radius, ["pills"]) ?? leafHex(radius, ["full"]) ?? "9999px",
        inputRadius: leafHex(radius, ["buttons"]) ?? leafHex(radius, ["lg"]) ?? "8px",
        elevation: recipeHints.elevation ?? "none",
        density: recipeHints.density ?? "comfortable",
        badgeDefault: "muted",
        outlineBorder: ink,
        // Sticky nav soft shadow lives in raised; cards stay flat
        elevationTokens: {
          card: "0 0 #0000",
          control: "0 0 #0000",
          raised: "0px 0.7px 1.462px 0px rgb(0 0 0 / 0.015), 0px 3px 9px 0px rgb(0 0 0 / 0.03)",
        },
      },
      typography: {
        fontSans: `'NotionInter', 'Inter', ui-sans-serif, system-ui, sans-serif`,
        fontDisplay: `'NotionInter', 'Inter', ui-sans-serif, system-ui, sans-serif`,
        headingWeight: 700,
        faces: [
          {
            family: "NotionInter",
            src: [
              {
                url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
                format: "woff2",
              },
            ],
            weight: "100 900",
            display: "swap",
          },
          {
            family: "Lyon Text",
            src: [{ url: "/brand-assets/lyon-text-regular.woff2", format: "woff2" }],
            weight: 400,
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: {
            fontSize: "12px",
            lineHeight: 1.33,
            fontWeight: 500,
            letterSpacing: "0.12px",
          },
          bodySm: { fontSize: "14px", lineHeight: 1.43, fontWeight: 500 },
          body: { fontSize: "16px", lineHeight: 1.5, fontWeight: 400 },
          subheading: { fontSize: "20px", lineHeight: 1, fontWeight: 500 },
          headingSm: {
            fontSize: "22px",
            lineHeight: 1.27,
            fontWeight: 600,
            letterSpacing: "-0.242px",
          },
          heading: { fontSize: "40px", lineHeight: 1.5, fontWeight: 600 },
        },
        marketing: {
          body: { fontSize: "16px", lineHeight: 1.5, fontWeight: 400 },
          heading: {
            fontSize: "48px",
            lineHeight: 1.5,
            fontWeight: 700,
          },
          headingLg: {
            fontSize: "54px",
            lineHeight: 1.04,
            fontWeight: 700,
            letterSpacing: "-1.89px",
          },
          display: {
            fontSize: "72px",
            lineHeight: 1.21,
            fontWeight: 700,
            letterSpacing: "-2.016px",
          },
        },
      },
      extensions: {
        categories: {
          brand: ink,
          action: blue,
          ghost: sky,
          marigold,
          coral,
          midnight,
          charcoal,
          graphite,
        },
        decorative: {
          marigold,
          coral,
          saffron: colors.saffron ?? "#e89d01",
          "sky-wash": colors["sky-wash"] ?? "#62aef0",
          midnight,
        },
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://www.notion.com",
        notes: [
          "roles.action = Notion Blue (only filled CTA). Accent hues are decorative card washes.",
          "roles.brand = Ink Black (logo / wordmark / text hierarchy via alpha).",
          "Canvas = Paper Warmth; cards = Pure White — never invert.",
          "Card elev=none + hairline border; sticky nav soft shadow → elevation raised slot.",
          "Buttons 8px, cards 12px, pills 9999px.",
          "Lyon Text is editorial accent only — not product chrome UI.",
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Stripe fixture ──────────────────────────────────────────────
  // Light frost ledger: pure-white canvas, indigo-ink action, midnight brand mark,
  // 4px controls (never pill), elevation=none (tint + frost hairlines, no box-shadow).
  if (preset === "stripe") {
    const white = colors["pure-white"] ?? "#ffffff";
    const mist = colors.mist ?? "#f8fafd";
    const frost = colors.frost ?? "#e5edf5";
    const midnight = colors["midnight-ink"] ?? "#061b31";
    const slate = colors.slate ?? "#64748d";
    const steel = colors.steel ?? "#50617a";
    const indigo = colors["indigo-ink"] ?? "#533afd";
    const indigoHover = colors["indigo-hover"] ?? "#7389ff";
    const lavender = colors["lavender-border"] ?? "#b9b9f9";
    const periwinkle = colors["periwinkle-wash"] ?? "#e8e9ff";
    const deep = colors["deep-violet"] ?? "#182659";
    const smoke = colors.smoke ?? "#839bc8";

    warnings.push(
      "Stripe: indigo-ink is action CTA only; midnight-ink is brand-mark/wordmark (never default CTA fill).",
    );
    warnings.push(
      "Stripe: elevation=none — depth via white→mist→frost tints + 1px frost rules, never box-shadow.",
    );

    const brand: BrandPackage = {
      id: "stripe",
      name: "Stripe",
      darkDefault: false,
      version: "1.0.0",
      roles: {
        canvas: tryHexToHsl(white, "0 0% 100%"),
        canvasForeground: tryHexToHsl(midnight, "208 78% 11%"),
        surface: tryHexToHsl(white, "0 0% 100%"),
        surfaceForeground: tryHexToHsl(midnight, "208 78% 11%"),
        action: tryHexToHsl(indigo, "248 98% 61%"),
        actionForeground: tryHexToHsl(white, "0 0% 100%"),
        brand: tryHexToHsl(midnight, "208 78% 11%"),
        brandForeground: tryHexToHsl(white, "0 0% 100%"),
        quiet: tryHexToHsl(periwinkle, "238 100% 95%"),
        quietForeground: tryHexToHsl(indigo, "248 98% 61%"),
        muted: tryHexToHsl(mist, "210 56% 98%"),
        mutedForeground: tryHexToHsl(slate, "215 16% 47%"),
        border: tryHexToHsl(frost, "210 36% 93%"),
        input: tryHexToHsl(white, "0 0% 100%"),
        ring: tryHexToHsl(indigo, "248 98% 61%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
        info: tryHexToHsl(indigoHover, "230 100% 73%"),
        infoForeground: tryHexToHsl(midnight, "208 78% 11%"),
      },
      semantic: {
        background: tryHexToHsl(white, "0 0% 100%"),
        foreground: tryHexToHsl(midnight, "208 78% 11%"),
        card: tryHexToHsl(white, "0 0% 100%"),
        cardForeground: tryHexToHsl(midnight, "208 78% 11%"),
        popover: tryHexToHsl(white, "0 0% 100%"),
        popoverForeground: tryHexToHsl(midnight, "208 78% 11%"),
        primary: tryHexToHsl(indigo, "248 98% 61%"),
        primaryForeground: tryHexToHsl(white, "0 0% 100%"),
        secondary: tryHexToHsl(periwinkle, "238 100% 95%"),
        secondaryForeground: tryHexToHsl(indigo, "248 98% 61%"),
        muted: tryHexToHsl(mist, "210 56% 98%"),
        mutedForeground: tryHexToHsl(slate, "215 16% 47%"),
        accent: tryHexToHsl(indigo, "248 98% 61%"),
        accentForeground: tryHexToHsl(white, "0 0% 100%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(white, "0 0% 100%"),
        border: tryHexToHsl(frost, "210 36% 93%"),
        input: tryHexToHsl(white, "0 0% 100%"),
        ring: tryHexToHsl(indigo, "248 98% 61%"),
        info: tryHexToHsl(indigoHover, "230 100% 73%"),
        infoForeground: tryHexToHsl(midnight, "208 78% 11%"),
      },
      recipe: {
        buttonDefault: recipeHints.buttonDefault ?? "solid",
        buttonRadius: recipeHints.buttonRadius ?? "4px",
        cardRadius: "4px",
        badgeRadius: "9999px",
        inputRadius: "4px",
        elevation: recipeHints.elevation ?? "none",
        density: recipeHints.density ?? "comfortable",
        badgeDefault: "muted",
        // Ghost outline companion uses lavender hairline, not carbon
        outlineBorder: lavender,
      },
      typography: {
        fontSans: `'sohne-var', 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif`,
        fontDisplay: `'sohne-var', 'Inter Tight', ui-sans-serif, system-ui, sans-serif`,
        // Whisper weight is the Stripe signature (even at 56px display)
        headingWeight: 300,
        faces: [
          {
            family: "sohne-var",
            // Placeholder — Create Center / licensed Söhne Variable
            src: [{ url: "/brand-assets/sohne-var.woff2", format: "woff2" }],
            weight: "300 400",
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: {
            fontSize: "12px",
            lineHeight: 1.45,
            fontWeight: 300,
            letterSpacing: "-0.12px",
          },
          bodySm: {
            fontSize: "14px",
            lineHeight: 1.4,
            fontWeight: 400,
            letterSpacing: "-0.14px",
          },
          body: {
            fontSize: "16px",
            lineHeight: 1.2,
            fontWeight: 400,
            letterSpacing: "-0.16px",
          },
          bodyLg: {
            fontSize: "20px",
            lineHeight: 1.4,
            fontWeight: 300,
            letterSpacing: "-0.2px",
          },
          subheading: {
            fontSize: "22px",
            lineHeight: 1.1,
            fontWeight: 300,
            letterSpacing: "-0.22px",
          },
          headingSm: {
            fontSize: "26px",
            lineHeight: 1.12,
            fontWeight: 300,
            letterSpacing: "-0.26px",
          },
          heading: {
            fontSize: "32px",
            lineHeight: 1.1,
            fontWeight: 300,
            letterSpacing: "-0.64px",
          },
        },
        marketing: {
          body: {
            fontSize: "16px",
            lineHeight: 1.4,
            fontWeight: 300,
            letterSpacing: "-0.16px",
          },
          heading: {
            fontSize: "32px",
            lineHeight: 1.1,
            fontWeight: 300,
            letterSpacing: "-0.64px",
          },
          headingLg: {
            fontSize: "48px",
            lineHeight: 1.03,
            fontWeight: 300,
            letterSpacing: "-0.96px",
          },
          display: {
            fontSize: "56px",
            lineHeight: 1.03,
            fontWeight: 300,
            letterSpacing: "-1.4px",
          },
        },
      },
      extensions: {
        categories: {
          brand: midnight,
          action: indigo,
          link: indigo,
          hover: indigoHover,
          ghostBorder: lavender,
          wash: periwinkle,
          deep: deep,
          smoke,
          steel,
        },
        decorative: {
          "section-band": mist,
          frost,
        },
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://stripe.com",
        notes: [
          "roles.action = Indigo Ink filled CTA; roles.brand = Midnight Ink wordmark.",
          "Elevation none — tint ladder + 1px frost rules; never box-shadow.",
          "Control radius 4px (not pill); tags may stay full-pill.",
          "Typography weight 300 is the product signature (Inter Tight substitute).",
          "Pair solid CTA with ghost outline (lavender border) as secondary.",
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Vanta fixture ───────────────────────────────────────────────
  // Light editorial ledger: parchment canvas, vivid-violet action, indigo-ink brand mark,
  // full-pill controls, elevation=none (1px carbon hairline borders, no box-shadow).
  if (preset === "vanta") {
    const parchment = colors.parchment ?? colors["page-canvas"] ?? "#f7f8fa";
    const paper = colors.paper ?? colors["card-surface"] ?? "#ffffff";
    const carbon = colors.carbon ?? "#181822";
    const graphite = colors.graphite ?? "#6d6e87";
    const steel = colors.steel ?? "#9e9fb7";
    const ash = colors.ash ?? "#dfdfe9";
    const fog = colors.fog ?? "#eaeaf1";
    const lavender = colors["lavender-wash"] ?? "#ddd6ff";
    const vivid = colors["vivid-violet"] ?? "#5e05c4";
    const indigo = colors["indigo-ink"] ?? "#260048";
    const mid = colors["mid-violet"] ?? "#8f47d5";
    const amber = colors["amber-signal"] ?? "#ffbe0f";

    warnings.push(
      "Vanta: vivid-violet is action CTA only; indigo-ink is brand-mark/logo (never default CTA fill).",
    );
    warnings.push("Vanta: elevation=none — cards use 1px carbon border, not box-shadow.");

    const brand: BrandPackage = {
      id: "vanta",
      name: "Vanta",
      darkDefault: false,
      version: "1.0.0",
      roles: {
        canvas: tryHexToHsl(parchment, "220 23% 97%"),
        canvasForeground: tryHexToHsl(carbon, "240 14% 11%"),
        surface: tryHexToHsl(paper, "0 0% 100%"),
        surfaceForeground: tryHexToHsl(carbon, "240 14% 11%"),
        // Action = single saturated CTA moment
        action: tryHexToHsl(vivid, "268 95% 39%"),
        actionForeground: tryHexToHsl(paper, "0 0% 100%"),
        // Brand mark = logo / wordmark / decorative ink (≠ action)
        brand: tryHexToHsl(indigo, "273 100% 14%"),
        brandForeground: tryHexToHsl(paper, "0 0% 100%"),
        // Quiet = lavender informational chips (not violet fill)
        quiet: tryHexToHsl(lavender, "249 100% 92%"),
        quietForeground: tryHexToHsl(indigo, "273 100% 14%"),
        muted: tryHexToHsl(fog, "240 14% 93%"),
        mutedForeground: tryHexToHsl(graphite, "237 11% 48%"),
        border: tryHexToHsl(carbon, "240 14% 11%"),
        input: tryHexToHsl(paper, "0 0% 100%"),
        ring: tryHexToHsl(vivid, "268 95% 39%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
        warning: tryHexToHsl(amber, "44 100% 53%"),
        warningForeground: tryHexToHsl(carbon, "240 14% 11%"),
        info: tryHexToHsl(mid, "269 63% 56%"),
        infoForeground: tryHexToHsl(paper, "0 0% 100%"),
      },
      // semantic filled by normalize from roles
      semantic: {
        background: tryHexToHsl(parchment, "220 23% 97%"),
        foreground: tryHexToHsl(carbon, "240 14% 11%"),
        card: tryHexToHsl(paper, "0 0% 100%"),
        cardForeground: tryHexToHsl(carbon, "240 14% 11%"),
        popover: tryHexToHsl(paper, "0 0% 100%"),
        popoverForeground: tryHexToHsl(carbon, "240 14% 11%"),
        primary: tryHexToHsl(vivid, "268 95% 39%"),
        primaryForeground: tryHexToHsl(paper, "0 0% 100%"),
        secondary: tryHexToHsl(lavender, "249 100% 92%"),
        secondaryForeground: tryHexToHsl(indigo, "273 100% 14%"),
        muted: tryHexToHsl(fog, "240 14% 93%"),
        mutedForeground: tryHexToHsl(graphite, "237 11% 48%"),
        accent: tryHexToHsl(indigo, "273 100% 14%"),
        accentForeground: tryHexToHsl(paper, "0 0% 100%"),
        destructive: "0 72% 51%",
        destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
        border: tryHexToHsl(carbon, "240 14% 11%"),
        input: tryHexToHsl(paper, "0 0% 100%"),
        ring: tryHexToHsl(vivid, "268 95% 39%"),
        warning: tryHexToHsl(amber, "44 100% 53%"),
        warningForeground: tryHexToHsl(carbon, "240 14% 11%"),
        info: tryHexToHsl(mid, "269 63% 56%"),
        infoForeground: tryHexToHsl(paper, "0 0% 100%"),
      },
      recipe: {
        buttonDefault: recipeHints.buttonDefault ?? "solid",
        // Prefer structural radius tokens (full=pill, 2xl=cards) over free-text
        buttonRadius:
          leafHex(radius, ["buttons"]) ??
          leafHex(radius, ["full"]) ??
          recipeHints.buttonRadius ??
          "999px",
        cardRadius: leafHex(radius, ["cards"]) ?? leafHex(radius, ["2xl"]) ?? "16px",
        badgeRadius:
          leafHex(radius, ["badges"]) ??
          leafHex(radius, ["full"]) ??
          recipeHints.buttonRadius ??
          "999px",
        inputRadius:
          leafHex(radius, ["inputs"]) ??
          leafHex(radius, ["full"]) ??
          recipeHints.buttonRadius ??
          "999px",
        elevation: recipeHints.elevation ?? "none",
        density: recipeHints.density ?? "comfortable",
        // Informational chips = lavender wash + indigo (quiet), not violet CTA fill
        badgeDefault: "muted",
        outlineBorder: carbon,
      },
      typography: {
        fontSans: `'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif`,
        fontDisplay: `'Reckless', 'Source Serif 4', 'Lora', ui-serif, Georgia, serif`,
        headingWeight: 500,
        faces: [
          {
            family: "Inter Variable",
            src: [
              {
                url: "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2",
                format: "woff2",
              },
            ],
            weight: "100 900",
            display: "swap",
          },
          {
            family: "Reckless",
            // Placeholder — Create Center / tenant hosts the licensed Reckless cut
            src: [{ url: "/brand-assets/reckless-regular.woff2", format: "woff2" }],
            weight: 400,
            display: "swap",
          },
          {
            family: "Reckless",
            src: [{ url: "/brand-assets/reckless-medium.woff2", format: "woff2" }],
            weight: 500,
            display: "swap",
          },
        ],
      },
      zones: {
        product: {
          caption: {
            fontSize: "12px",
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: "-0.02px",
          },
          bodySm: {
            fontSize: "14px",
            lineHeight: 1.43,
            fontWeight: 400,
            letterSpacing: "-0.02px",
          },
          body: {
            fontSize: "16px",
            lineHeight: 1.5,
            fontWeight: 400,
            letterSpacing: "-0.02px",
          },
          subheading: { fontSize: "20px", lineHeight: 1.4, fontWeight: 500 },
          headingSm: { fontSize: "24px", lineHeight: 1.35, fontWeight: 500 },
          heading: { fontSize: "32px", lineHeight: 1.3, fontWeight: 500 },
        },
        marketing: {
          body: {
            fontSize: "16px",
            lineHeight: 1.5,
            fontWeight: 400,
            letterSpacing: "-0.02px",
          },
          heading: {
            fontSize: "42px",
            lineHeight: 1.2,
            fontWeight: 400,
            letterSpacing: "-0.84px",
          },
          headingLg: {
            fontSize: "56px",
            lineHeight: 1.15,
            fontWeight: 400,
            letterSpacing: "-1.12px",
          },
          display: {
            fontSize: "90px",
            lineHeight: 1.1,
            fontWeight: 400,
            letterSpacing: "-1.62px",
          },
        },
      },
      extensions: {
        categories: {
          brand: indigo,
          action: vivid,
          link: mid,
          heroWash: lavender,
          warning: amber,
          steel,
          ash,
        },
        decorative: {
          "hero-wash": lavender,
        },
        sourceUrl: typeof refero.url === "string" ? refero.url : "https://www.vanta.com",
        notes: [
          "roles.action = Vivid Violet (filled CTA only).",
          "roles.brand = Indigo Ink (logo / wordmark / brand-mark).",
          "Elevation none — 1px carbon borders frame cards; no drop-shadow.",
          "Full-pill controls (999px); cards 16px.",
          "UI = Inter Variable; marketing display = Reckless serif.",
          "Lavender wash is marketing hero surface (decorative), not product chrome fill.",
        ],
      },
    };
    return finish(brand, warnings);
  }

  // ── Generic heuristic ───────────────────────────────────────────
  warnings.push(
    "Unknown brand layout — compiled with heuristic recipe. Review mapping in Create Center.",
  );
  warnings.push(...recipeHints.notes);
  const entries = Object.entries(colors);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (colors[k]) return colors[k];
    }
    return undefined;
  };
  // Page canvas first (warm paper / parchment), then pure white, then dark voids.
  // Notion: paper-warmth is canvas; pure-white is card — never invert.
  const bg =
    pick(
      "paper-warmth",
      "paper-white",
      "page-canvas",
      "parchment",
      "pure-white",
      "paper",
      "background",
      "canvas",
      "void-black",
      "void",
      "just-black",
      "off-black",
    ) ?? "#0a0a0a";

  // Detect light canvas early so fg/primary picks don't invert
  const isLightCanvas = (() => {
    try {
      const m = tryHexToHsl(bg, "0 0% 4%").match(/(\d+)%\s*$/);
      return m ? Number(m[1]) >= 50 : false;
    } catch {
      return false;
    }
  })();

  // Light: ink/carbon text — never pure-white; prefer ink-black over decorative midnight.
  const fg = isLightCanvas
    ? (pick(
        "ink-black",
        "carbon",
        "charcoal",
        "obsidian",
        "foreground",
        "ink",
        "midnight-ink",
        "deep-violet",
        "slate",
      ) ?? "#181822")
    : (pick("pure-white", "paper", "surface-cream", "bone", "mist", "foreground", "white") ??
      "#ffffff");

  // Chromatic *action* tokens only — never canvas/surface/decorative wash names
  const primary =
    pick(
      "notion-blue",
      "indigo-ink",
      "vivid-violet",
      "primary",
      "acid-lime",
      "obsidian",
      "shockingly-green",
      "brand",
      "accent",
      "mid-violet",
      "amethyst-edge",
      "signal-blue",
    ) ??
    entries.find(
      ([k]) =>
        !/void|black|canvas|graphite|paper|hairline|ash|parchment|fog|lavender|steel|slate|carbon|mist|frost|smoke|white|midnight|warmth|tint|wash|marigold|coral|saffron|mocha|vermillion|sky/i.test(
          k,
        ),
    )?.[1] ??
    (isLightCanvas ? "#171717" : "#3b82f6");

  // Brand-mark ≠ action: logo inks — not decorative midnight/coral washes by default
  const brandMarkHex =
    pick("ink-black", "coral-pulse", "brand-mark", "logo", "wordmark", "charcoal", "deep-violet") ??
    undefined;

  const border = isLightCanvas
    ? (pick("frost", "hairline", "border", "ash", "carbon", "lilac-border", "slate") ?? "#e5e5e5")
    : (pick("hairline", "border", "slate", "graphite", "surface-25", "smoke") ?? "#333333");
  const mutedFg =
    pick(
      "stone",
      "charcoal",
      "graphite",
      "steel",
      "slate",
      "muted",
      "smoke",
      "ash",
      "fog",
      "surface-50",
    ) ?? "#888888";
  const card = isLightCanvas
    ? (pick("pure-white", "paper", "card-surface", "card") ?? "#ffffff")
    : (pick("ink", "carbon", "off-black", "obsidian", "card") ?? bg);

  const quiet = isLightCanvas
    ? (pick("sky-tint", "periwinkle-wash", "lavender-wash", "mist", "fog", "ash", "secondary") ??
      border)
    : (pick("graphite", "obsidian", "smoke", "secondary") ?? border);

  const uiFont = pickUiFontFamily(font) ?? "Inter";
  const displayFont = pickDisplayFontFamily(font);

  const recipe: BrandRecipe = {
    buttonDefault: recipeHints.buttonDefault ?? "solid",
    buttonRadius:
      recipeHints.buttonRadius ??
      leafHex(radius, ["buttons"]) ??
      leafHex(radius, ["md"]) ??
      "0.375rem",
    cardRadius:
      recipeHints.cardRadius ??
      leafHex(radius, ["cards"]) ??
      leafHex(radius, ["xl"]) ??
      leafHex(radius, ["lg"]) ??
      "0.75rem",
    badgeRadius: leafHex(radius, ["pills"]) ?? leafHex(radius, ["badges"]) ?? "9999px",
    inputRadius: leafHex(radius, ["inputs"]) ?? recipeHints.buttonRadius ?? "0.375rem",
    elevation: recipeHints.elevation ?? "soft",
    density: recipeHints.density ?? "comfortable",
    outlineBorder: isLightCanvas ? border : fg,
    badgeDefault: brandMarkHex ? "muted" : "match-action",
  };

  const brand: BrandPackage = {
    id,
    name: siteName,
    darkDefault: !isLightCanvas,
    version: "0.1.0",
    semantic: isLightCanvas
      ? {
          background: tryHexToHsl(bg, "0 0% 98%"),
          foreground: tryHexToHsl(fg, "0 0% 9%"),
          card: tryHexToHsl(card, "0 0% 100%"),
          cardForeground: tryHexToHsl(fg, "0 0% 9%"),
          popover: tryHexToHsl(card, "0 0% 100%"),
          popoverForeground: tryHexToHsl(fg, "0 0% 9%"),
          primary: tryHexToHsl(primary, "0 0% 9%"),
          primaryForeground: tryHexToHsl(card, "0 0% 100%"),
          secondary: tryHexToHsl(quiet, "0 0% 92%"),
          secondaryForeground: tryHexToHsl(fg, "0 0% 9%"),
          muted: tryHexToHsl(quiet, "0 0% 92%"),
          mutedForeground: tryHexToHsl(mutedFg, "0 0% 40%"),
          accent: tryHexToHsl(quiet, "0 0% 92%"),
          accentForeground: tryHexToHsl(fg, "0 0% 9%"),
          destructive: "0 72% 51%",
          destructiveForeground: "0 0% 100%",
          border: tryHexToHsl(border, "0 0% 20%"),
          input: tryHexToHsl(card, "0 0% 100%"),
          ring: tryHexToHsl(primary, "0 0% 9%"),
        }
      : {
          background: tryHexToHsl(bg, "0 0% 4%"),
          foreground: tryHexToHsl(fg, "0 0% 98%"),
          card: tryHexToHsl(card, "0 0% 8%"),
          cardForeground: tryHexToHsl(fg, "0 0% 98%"),
          popover: tryHexToHsl(card, "0 0% 8%"),
          popoverForeground: tryHexToHsl(fg, "0 0% 98%"),
          primary: tryHexToHsl(primary, "217 91% 60%"),
          primaryForeground: tryHexToHsl(bg, "0 0% 4%"),
          secondary: tryHexToHsl(border, "0 0% 20%"),
          secondaryForeground: tryHexToHsl(fg, "0 0% 98%"),
          muted: tryHexToHsl(card, "0 0% 8%"),
          mutedForeground: tryHexToHsl(mutedFg, "0 0% 53%"),
          accent: tryHexToHsl(border, "0 0% 20%"),
          accentForeground: tryHexToHsl(primary, "217 91% 60%"),
          destructive: "0 72% 51%",
          destructiveForeground: "0 0% 100%",
          border: tryHexToHsl(border, "0 0% 20%"),
          input: tryHexToHsl(border, "0 0% 20%"),
          ring: tryHexToHsl(primary, "217 91% 60%"),
        },
    recipe: {
      ...recipe,
      ...(recipe.elevation === "key" && isLightCanvas
        ? { elevation: "hairline" as const }
        : recipe.elevation
          ? { elevation: recipe.elevation }
          : {}),
    },
    typography: {
      fontSans: `'${uiFont}', ui-sans-serif, system-ui, sans-serif`,
      ...(displayFont ? { fontDisplay: `'${displayFont}', ui-serif, Georgia, serif` } : {}),
      headingWeight: isLightCanvas ? 500 : 600,
    },
    extensions: {
      ...(typeof refero.url === "string" ? { sourceUrl: refero.url } : {}),
      ...(brandMarkHex ? { categories: { brand: brandMarkHex } } : {}),
      notes: [
        "Generic compile — verify primary + buttonDefault in Create Center.",
        ...(brandMarkHex
          ? ["Detected separate brand-mark color (categories.brand → --brand-mark)."]
          : []),
      ],
    },
  };

  return finish(brand, warnings);
}
