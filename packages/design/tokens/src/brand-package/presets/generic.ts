/**
 * Generic heuristic compile path for unknown brands.
 */
import { leafHex, pickDisplayFontFamily, pickUiFontFamily } from "../compile-helpers";
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

export function buildGeneric(ctx: CompileContext): BrandPackage {
  ctx.warnings.push(
    "Unknown brand layout — compiled with heuristic recipe. Review mapping in Create Center.",
  );
  ctx.warnings.push(...ctx.recipeHints.notes);
  const entries = Object.entries(ctx.colors);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (ctx.colors[k]) return ctx.colors[k];
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

  const uiFont = pickUiFontFamily(ctx.font) ?? "Inter";
  const displayFont = pickDisplayFontFamily(ctx.font);

  let elevationPreset = ctx.recipeHints.elevationPreset ?? "soft";
  if (elevationPreset === "key" && isLightCanvas) elevationPreset = "hairline";

  const brand: BrandPackage = {
    id: ctx.id,
    name: ctx.siteName,
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
    recipe: buildRecipe({
      buttonDefault: ctx.recipeHints.buttonDefault ?? "solid",
      radii: {
        button:
          ctx.recipeHints.radii?.button ??
          leafHex(ctx.radius, ["buttons"]) ??
          leafHex(ctx.radius, ["md"]) ??
          "0.375rem",
        card:
          ctx.recipeHints.radii?.card ??
          leafHex(ctx.radius, ["cards"]) ??
          leafHex(ctx.radius, ["xl"]) ??
          leafHex(ctx.radius, ["lg"]) ??
          "0.75rem",
        badge: leafHex(ctx.radius, ["pills"]) ?? leafHex(ctx.radius, ["badges"]) ?? "9999px",
        input: leafHex(ctx.radius, ["inputs"]) ?? ctx.recipeHints.radii?.button ?? "0.375rem",
      },
      elevationPreset,
      density: ctx.recipeHints.density ?? "comfortable",
      outlineBorder: isLightCanvas ? border : fg,
      badgeDefault: brandMarkHex ? "muted" : "match-action",
    }),
    typography: {
      fontSans: `'${uiFont}', ui-sans-serif, system-ui, sans-serif`,
      ...(displayFont ? { fontDisplay: `'${displayFont}', ui-serif, Georgia, serif` } : {}),
      headingWeight: isLightCanvas ? 500 : 600,
    },
    extensions: {
      ...(typeof ctx.refero.url === "string" ? { sourceUrl: ctx.refero.url } : {}),
      ...(brandMarkHex ? { categories: { brand: brandMarkHex } } : {}),
      notes: [
        "Generic compile — verify primary + buttonDefault in Create Center.",
        ...(brandMarkHex
          ? ["Detected separate brand-mark color (categories.brand → --brand-mark)."]
          : []),
      ],
    },
  };

  return brand;
}
