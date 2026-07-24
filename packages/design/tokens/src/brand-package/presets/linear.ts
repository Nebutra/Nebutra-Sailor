/**
 * linear design-language compile preset (stress fixture).
 * Dual-mode: dark void default + light monochrome paper (acid-lime CTA both modes).
 */
import { tryHexToHsl } from "../hex-to-hsl";
import type { BrandPackage, BrandSemanticColors } from "../types";
import type { CompileContext } from "./context";
import { buildRecipe } from "./recipe";

function linearDarkSemantic(
  voidC: string,
  carbon: string,
  graphite: string,
  ash: string,
  paper: string,
  lime: string,
  coral: string,
  pulse: string,
  colors: Record<string, string>,
): BrandSemanticColors {
  return {
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
  };
}

/** Light shell — paper canvas, same acid-lime CTA, graphite chrome. */
function linearLightSemantic(
  voidC: string,
  ash: string,
  paper: string,
  lime: string,
  coral: string,
  pulse: string,
  colors: Record<string, string>,
): BrandSemanticColors {
  return {
    background: "0 0% 100%",
    foreground: tryHexToHsl(voidC, "210 11% 4%"),
    card: "0 0% 98%",
    cardForeground: tryHexToHsl(voidC, "210 11% 4%"),
    popover: "0 0% 100%",
    popoverForeground: tryHexToHsl(voidC, "210 11% 4%"),
    primary: tryHexToHsl(lime, "66 89% 54%"),
    primaryForeground: tryHexToHsl(voidC, "210 11% 4%"),
    secondary: "220 14% 96%",
    secondaryForeground: tryHexToHsl(voidC, "210 11% 4%"),
    muted: "220 14% 96%",
    mutedForeground: tryHexToHsl(ash, "220 5% 41%"),
    accent: "220 14% 96%",
    accentForeground: tryHexToHsl(voidC, "210 11% 4%"),
    destructive: tryHexToHsl(coral, "0 79% 63%"),
    destructiveForeground: tryHexToHsl(paper, "0 0% 100%"),
    border: "220 13% 91%",
    input: "0 0% 100%",
    ring: tryHexToHsl(lime, "66 89% 54%"),
    success: tryHexToHsl(pulse, "136 61% 40%"),
    successForeground: tryHexToHsl(paper, "0 0% 100%"),
    info: tryHexToHsl(colors["signal-teal"] ?? "#02b8cc", "187 98% 40%"),
    infoForeground: tryHexToHsl(paper, "0 0% 100%"),
  };
}

export function buildLinear(ctx: CompileContext): BrandPackage {
  const voidC = ctx.colors.void ?? ctx.colors["just-black"] ?? "#08090a";
  const carbon = ctx.colors.carbon ?? "#0f1011";
  const graphite = ctx.colors.graphite ?? "#23252a";
  const ash = ctx.colors.ash ?? "#62666d";
  const paper = ctx.colors.paper ?? "#ffffff";
  const lime = ctx.colors["acid-lime"] ?? "#e4f222";
  const coral = ctx.colors["coral-red"] ?? "#eb5757";
  const pulse = ctx.colors["pulse-green"] ?? "#27a644";

  const dark = linearDarkSemantic(
    voidC,
    carbon,
    graphite,
    ash,
    paper,
    lime,
    coral,
    pulse,
    ctx.colors,
  );
  const light = linearLightSemantic(voidC, ash, paper, lime, coral, pulse, ctx.colors);

  const brand: BrandPackage = {
    id: "linear",
    name: "Linear",
    darkDefault: true,
    version: "1.0.0",
    semantic: dark,
    modes: {
      dark: { semantic: dark },
      light: { semantic: light },
    },
    recipe: buildRecipe({
      buttonDefault: "solid",
      radii: { button: "6px", card: "12px" },
      elevationPreset: "soft",
      density: "compact",
    }),
    typography: {
      fontSans: `'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif`,
      fontMono: `'Berkeley Mono', 'JetBrains Mono', ui-monospace, monospace`,
      headingWeight: 510,
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
      sourceUrl: typeof ctx.refero.url === "string" ? ctx.refero.url : "https://linear.app",
      notes: ["Dual-mode: dark void default + light paper; acid-lime solid CTA in both modes."],
    },
  };
  return brand;
}
