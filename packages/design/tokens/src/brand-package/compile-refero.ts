import { emitBrandCss } from "./emit-css";
import { tryHexToHsl } from "./hex-to-hsl";
import { inferRecipeFromDesignMd } from "./infer-recipe";
import type {
  BrandPackage,
  BrandRecipe,
  ButtonDefaultStyle,
  CompileResult,
  Density,
} from "./types";

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
): "linear" | "gsap" | "generic" {
  const id = idHint.toLowerCase();
  if (id.includes("linear")) return "linear";
  if (id.includes("gsap")) return "gsap";
  // Heuristics from Refero extractions
  if (colors["acid-lime"] || colors.void) return "linear";
  if (colors["shockingly-green"] || colors["surface-cream"] || colors["just-black"]) return "gsap";
  if (colors["just-black"] && colors["surface-cream"]) return "gsap";
  return "generic";
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
    return { brand, css: emitBrandCss(brand), warnings };
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
    return { brand, css: emitBrandCss(brand), warnings };
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
  const bg = pick("background", "canvas", "void", "just-black", "off-black") ?? "#0a0a0a";
  const fg = pick("foreground", "paper", "surface-cream", "bone", "white") ?? "#ffffff";
  const primary =
    pick("primary", "acid-lime", "shockingly-green", "brand", "accent") ??
    entries[0]?.[1] ??
    "#3b82f6";
  const border = pick("border", "graphite", "surface-25", "smoke") ?? "#333333";
  const mutedFg = pick("muted", "ash", "fog", "surface-50") ?? "#888888";
  const card = pick("card", "carbon", "off-black", "obsidian") ?? bg;

  const fontName =
    leafHex(font as Json, [Object.keys(font)[0] ?? "sans"]) ||
    (typeof (Object.values(font)[0] as Json | undefined)?.$value === "string"
      ? String((Object.values(font)[0] as Json).$value)
      : "Inter");

  const recipe: BrandRecipe = {
    buttonDefault: recipeHints.buttonDefault ?? "solid",
    buttonRadius:
      recipeHints.buttonRadius ??
      leafHex(radius, ["buttons"]) ??
      leafHex(radius, ["md"]) ??
      "0.375rem",
    cardRadius: leafHex(radius, ["cards"]) ?? leafHex(radius, ["lg"]) ?? "0.75rem",
    elevation: recipeHints.elevation ?? "soft",
    density: recipeHints.density ?? "comfortable",
    outlineBorder: fg,
  };

  const brand: BrandPackage = {
    id,
    name: siteName,
    darkDefault: true,
    version: "0.1.0",
    semantic: {
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
    recipe,
    typography: {
      fontSans: `'${fontName}', ui-sans-serif, system-ui, sans-serif`,
      headingWeight: 600,
    },
    extensions: {
      ...(typeof refero.url === "string" ? { sourceUrl: refero.url } : {}),
      notes: ["Generic compile — verify primary + buttonDefault in Create Center."],
    },
  };

  return { brand, css: emitBrandCss(brand), warnings };
}
