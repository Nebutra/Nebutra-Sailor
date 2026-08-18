/**
 * vercel design-language compile preset (stress fixture).
 * Dual-mode: light monochrome + dark monochrome (orthogonal to ThemeProvider class).
 */
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage, BrandSemanticColors } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

function vercelLightSemantic(
  paper: string,
  pure: string,
  hairline: string,
  charcoal: string,
  stone: string,
  obsidian: string,
  terminal: string,
): BrandSemanticColors {
  return {
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
  };
}

/** Dark shell monochrome — white CTA on carbon, hairline borders. */
function vercelDarkSemantic(terminal: string): BrandSemanticColors {
  return {
    background: "0 0% 0%",
    foreground: "0 0% 93%",
    card: "0 0% 4%",
    cardForeground: "0 0% 93%",
    popover: "0 0% 4%",
    popoverForeground: "0 0% 93%",
    primary: "0 0% 100%",
    primaryForeground: "0 0% 0%",
    secondary: "0 0% 12%",
    secondaryForeground: "0 0% 93%",
    muted: "0 0% 12%",
    mutedForeground: "0 0% 63%",
    accent: "0 0% 12%",
    accentForeground: "0 0% 93%",
    destructive: "0 72% 51%",
    destructiveForeground: "0 0% 100%",
    border: "0 0% 16%",
    input: "0 0% 4%",
    ring: "0 0% 100%",
    success: tryHexToHsl(terminal, "133 49% 40%"),
    successForeground: "0 0% 100%",
    info: "0 0% 70%",
    infoForeground: "0 0% 0%",
  };
}

export function buildVercel(ctx: CompileContext): BrandPackage {
  const paper = ctx.colors["paper-white"] ?? ctx.colors["page-canvas"] ?? "#fafafa";
  const pure = ctx.colors["pure-white"] ?? ctx.colors["card-surface"] ?? "#ffffff";
  const hairline = ctx.colors.hairline ?? "#ebebeb";
  const charcoal = ctx.colors.charcoal ?? "#4d4d4d";
  const stone = ctx.colors.stone ?? "#666666";
  const obsidian = ctx.colors.obsidian ?? ctx.colors["inverted-surface"] ?? "#171717";
  const carbon = ctx.colors.carbon ?? "#000000";
  const terminal = ctx.colors["terminal-green"] ?? "#297a3a";

  ctx.warnings.push(
    "Vercel: monochrome dual-mode — no chromatic CTA; Terminal Green is support only.",
  );

  const light = vercelLightSemantic(paper, pure, hairline, charcoal, stone, obsidian, terminal);
  const dark = vercelDarkSemantic(terminal);

  const brand: BrandPackage = {
    id: "vercel",
    name: "Vercel",
    darkDefault: false,
    version: "1.0.0",
    semantic: light,
    modes: {
      light: { semantic: light },
      dark: { semantic: dark },
    },
    recipe: buildRecipe({
      buttonDefault: "solid",
      radii: {
        button: ctx.recipeHints.radii?.button ?? "6px",
        card: "6px",
        badge: "6px",
        input: "6px",
      },
      elevationPreset:
        ctx.recipeHints.elevationPreset === "key"
          ? "hairline"
          : (ctx.recipeHints.elevationPreset ?? "hairline"),
      density: ctx.recipeHints.density ?? "compact",
      badgeDefault: "muted",
      cardShadow: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgb(250, 250, 250) 0px 0px 0px 1px",
      outlineBorder: hairline,
    }),
    // Neutral and quick. Geist treats motion as feedback rather than
    // expression, so the ramp is short and the curve is the platform default.
    motion: {
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      micro: 100,
      flow: 150,
      reveal: 200,
      cinematic: 300,
    },
    // Geist's default rhythm — the middle of the seven, same figures as the
    // shared fallback rail so a page with no language selected still matches it.
    spacing: {
      xs: "0.5rem",
      sm: "0.75rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
    },
    typography: {
      fontSans: `'Geist Sans', 'Geist', ui-sans-serif, system-ui, sans-serif`,
      fontMono: `'Geist Mono', ui-monospace, Menlo, monospace`,
      fontDisplay: `'Geist Sans', 'Geist', ui-sans-serif, system-ui, sans-serif`,
      headingWeight: 450,
    },
    extensions: {
      categories: {
        carbon: carbon,
        terminal: terminal,
      },
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://vercel.com",
      notes: [
        "Dual-mode monochrome — light: Obsidian CTA; dark: white CTA on carbon.",
        "Elevation is hairline double-ring, never drop-shadow.",
        "Spectrum/solar gradients are marketing-only decorative (not product chrome).",
      ],
    },
  };
  return brand;
}
