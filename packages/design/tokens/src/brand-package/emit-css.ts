/**
 * Emit carrier CSS from a normalized Brand Package.
 * Components bind: --primary (= action), --brand-mark, --elevation-*, --radius-*.
 */

import { isDualModeBrand, normalizeBrandPackage } from "./normalize";
import type {
  BrandColorRoles,
  BrandFontFace,
  BrandMotion,
  BrandPackage,
  BrandRecipe,
  BrandSemanticColors,
  BrandSpacing,
} from "./types";

/** Biome CSS formatter prefers double-quoted font families over single quotes. */
function cssFontStack(stack: string): string {
  return stack.replace(/'/g, '"');
}

/**
 * Timing for one language.
 *
 * Emits both spellings the shared sheet ships — `--duration-flow` and
 * `--motion-duration-flow` — because both are already consumed and a skin that
 * set only one would leave half the surface on the default ramp, which reads as
 * a language that moves at two speeds.
 *
 * Only the keys the package declares are written. An omitted curve inherits the
 * shared ramp rather than being reset to it, so a language can adjust its
 * durations without also restating curves it does not care about.
 */
function motionVars(motion: BrandMotion | undefined): string[] {
  if (!motion) return [];
  const lines: string[] = [];
  // Both rails, for the same reason the durations write both spellings: the
  // utility layer reads --motion-ease-*, hand-written CSS reads --ease-*, and a
  // skin that moved only one would animate its utilities and its stylesheets at
  // different speeds.
  const curves: Array<[keyof BrandMotion, string]> = [
    ["easeOut", "ease-out"],
    ["easeInOut", "ease-in-out"],
    ["easeSpring", "ease-spring"],
  ];
  for (const [key, name] of curves) {
    const value = motion[key];
    if (typeof value !== "string" || !value.trim()) continue;
    lines.push(`  --${name}: ${value};`);
    lines.push(`  --motion-${name}: ${value};`);
  }
  const durations: Array<[keyof BrandMotion, string]> = [
    ["micro", "micro"],
    ["flow", "flow"],
    ["reveal", "reveal"],
    ["cinematic", "cinematic"],
  ];
  for (const [key, name] of durations) {
    const value = motion[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    lines.push(`  --duration-${name}: ${value}ms;`);
    lines.push(`  --motion-duration-${name}: ${value}ms;`);
  }
  return lines.length ? [``, `  /* Motion */`, ...lines] : [];
}

/**
 * Breathing room for one language.
 *
 * Writes only `--space-source-*`. Consumers read those vars directly
 * (`var(--space-source-md, …)`). We deliberately do NOT also emit
 * `--spacing-sm|md|…` into @theme: Tailwind v4 treats every --spacing-{key}
 * as a size token, so max-w-sm / max-w-2xl would resolve to the breathing
 * lengths (0.75rem…3rem) instead of the container scale (24rem…42rem).
 */
function spacingVars(spacing: BrandSpacing | undefined): string[] {
  if (!spacing) return [];
  const lines: string[] = [];
  const steps: Array<[keyof BrandSpacing, string]> = [
    ["xs", "xs"],
    ["sm", "sm"],
    ["md", "md"],
    ["lg", "lg"],
    ["xl", "xl"],
    ["2xl", "2xl"],
  ];
  for (const [key, name] of steps) {
    const value = spacing[key];
    if (typeof value !== "string" || !value.trim()) continue;
    lines.push(`  --space-source-${name}: ${value};`);
  }
  return lines.length ? [``, `  /* Spacing */`, ...lines] : [];
}

function recipeVars(recipe: BrandRecipe): string[] {
  const radii = recipe.radii;
  const elev = recipe.elevationTokens;

  const lines: string[] = [
    `  /* Shape slots */`,
    `  --btn-default-radius: ${radii.button};`,
    `  --radius-button: ${radii.button};`,
    `  --radius-buttons: ${radii.button};`,
    `  --radius-md: ${radii.button};`,
    `  --radius-card: ${radii.card};`,
    `  --radius-lg: ${radii.card};`,
    `  --radius-badge: ${radii.badge ?? "9999px"};`,
    `  --badge-default-radius: ${radii.badge ?? "9999px"};`,
    `  --radius-inputs: ${radii.input ?? radii.button};`,
    `  --input-radius: ${radii.input ?? radii.button};`,
    `  --radius-pill: ${radii.pill ?? "9999px"};`,
    ``,
    `  /* Free elevation (carrier-provided CSS shadows) */`,
    `  --elevation-card: ${elev.card};`,
    `  --elevation-control: ${elev.control ?? "0 0 #0000"};`,
    `  --elevation-raised: ${elev.raised ?? elev.card};`,
    // --elevation-*, not --shadow-*. The theme block maps `--shadow-md` to
    // `var(--elevation-md)` and inlines that into `.shadow-md`, so a skin that
    // set --shadow-md was writing to the alias while the utility read the
    // source. Every language's shadows were therefore byte-identical in the
    // browser — measured across all seven with getComputedStyle — while the
    // token files disagreed convincingly. Setting the source is what a brand
    // switch needs; the alias takes care of itself.
    `  --elevation-xs: ${elev.control ?? "0 0 #0000"};`,
    `  --elevation-sm: ${elev.card};`,
    `  --elevation-md: ${elev.raised ?? elev.card};`,
    `  --elevation-lg: ${elev.raised ?? elev.card};`,
    `  --btn-default-shadow: 0 0 #0000;`,
  ];

  switch (recipe.buttonDefault) {
    case "outline": {
      const edge = recipe.outlineBorder ?? "hsl(var(--foreground))";
      lines.push("  --btn-default-bg: transparent;");
      lines.push("  --btn-default-fg: hsl(var(--foreground));");
      lines.push("  --btn-default-border-width: 1px;");
      lines.push("  --btn-default-border: transparent;");
      lines.push(`  --btn-default-stroke-gradient: linear-gradient(${edge}, ${edge});`);
      lines.push("  --btn-default-hover-bg: hsl(var(--foreground) / 0.06);");
      break;
    }
    case "gradient-stroke": {
      const grad =
        recipe.primaryStrokeGradient ??
        "linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 55%, white))";
      lines.push("  --btn-default-bg: transparent;");
      lines.push("  --btn-default-fg: hsl(var(--foreground));");
      lines.push("  --btn-default-border-width: 1.5px;");
      lines.push("  --btn-default-border: transparent;");
      lines.push(`  --btn-default-stroke-gradient: ${grad};`);
      lines.push("  --btn-default-hover-bg: hsl(var(--primary) / 0.08);");
      break;
    }
    default:
      lines.push("  --btn-default-bg: hsl(var(--primary));");
      lines.push("  --btn-default-fg: hsl(var(--primary-foreground));");
      lines.push("  --btn-default-border-width: 0px;");
      lines.push("  --btn-default-border: transparent;");
      // A gradient, not `transparent`. This slot is a background-image layer:
      // a colour invalidates the whole declaration and takes the solid fill
      // above it with it, leaving the button with no background. Every solid
      // skin goes through this branch, so the one wrong word reached them all.
      lines.push("  --btn-default-stroke-gradient: linear-gradient(transparent, transparent);");
      lines.push(
        "  --btn-default-hover-bg: color-mix(in srgb, hsl(var(--primary)) 90%, transparent);",
      );
      break;
  }

  const badgeMode = recipe.badgeDefault ?? "match-action";
  if (badgeMode === "outline") {
    const edge = recipe.outlineBorder ?? "hsl(var(--border))";
    lines.push("  --badge-default-bg: transparent;");
    lines.push("  --badge-default-fg: hsl(var(--foreground));");
    lines.push(`  --badge-default-border: ${edge};`);
    lines.push("  --badge-default-hover-bg: hsl(var(--foreground) / 0.06);");
  } else if (badgeMode === "muted") {
    lines.push("  --badge-default-bg: hsl(var(--secondary));");
    lines.push("  --badge-default-fg: hsl(var(--secondary-foreground));");
    lines.push("  --badge-default-border: transparent;");
    lines.push("  --badge-default-hover-bg: color-mix(in srgb, hsl(var(--secondary)) 90%, white);");
  } else if (badgeMode === "brand") {
    lines.push("  --badge-default-bg: hsl(var(--brand-mark, var(--accent)));");
    lines.push(
      "  --badge-default-fg: hsl(var(--brand-mark-foreground, var(--accent-foreground)));",
    );
    lines.push("  --badge-default-border: transparent;");
    lines.push(
      "  --badge-default-hover-bg: color-mix(in srgb, hsl(var(--brand-mark, var(--accent))) 85%, transparent);",
    );
  } else if (recipe.buttonDefault === "outline" || recipe.buttonDefault === "gradient-stroke") {
    const edge = recipe.outlineBorder ?? "hsl(var(--foreground))";
    lines.push("  --badge-default-bg: transparent;");
    lines.push("  --badge-default-fg: hsl(var(--foreground));");
    lines.push(`  --badge-default-border: ${edge};`);
    lines.push("  --badge-default-hover-bg: hsl(var(--foreground) / 0.06);");
  } else {
    // match-action
    lines.push("  --badge-default-bg: hsl(var(--primary));");
    lines.push("  --badge-default-fg: hsl(var(--primary-foreground));");
    lines.push("  --badge-default-border: transparent;");
    lines.push(
      "  --badge-default-hover-bg: color-mix(in srgb, hsl(var(--primary)) 80%, transparent);",
    );
  }

  if (recipe.density === "compact") {
    lines.push("  --btn-default-padding-y: 0.5rem;");
    lines.push("  --btn-default-padding-x: 0.875rem;");
    lines.push("  --control-height-tiny: 1.25rem;");
    lines.push("  --control-height-sm: 1.75rem;");
    lines.push("  --control-height-md: 2rem;");
    lines.push("  --control-height-lg: 2.5rem;");
    lines.push("  --control-height-icon-sm: 1.5rem;");
    lines.push("  --control-height-icon-md: 1.75rem;");
    lines.push("  --control-height-icon-lg: 2rem;");
    lines.push("  --control-font-size-md: 0.8125rem;");
  } else if (recipe.density === "spacious") {
    lines.push("  --btn-default-padding-y: 0.875rem;");
    lines.push("  --btn-default-padding-x: 1.5rem;");
    lines.push("  --control-height-tiny: 1.75rem;");
    lines.push("  --control-height-sm: 2.25rem;");
    lines.push("  --control-height-md: 2.75rem;");
    lines.push("  --control-height-lg: 3.25rem;");
    lines.push("  --control-height-icon-sm: 2rem;");
    lines.push("  --control-height-icon-md: 2.25rem;");
    lines.push("  --control-height-icon-lg: 2.5rem;");
  }

  return lines;
}

function emitFontFaces(faces: BrandFontFace[] | undefined): string[] {
  if (!faces?.length) return [];
  const out: string[] = ["/* Brand font faces */"];
  for (const face of faces) {
    const src = face.src
      .map((s) => {
        const fmt = s.format ? ` format("${s.format}")` : "";
        return `url("${s.url}")${fmt}`;
      })
      .join(", ");
    out.push("@font-face {");
    out.push(`  font-family: "${face.family}";`);
    out.push(`  src: ${src};`);
    if (face.weight != null) out.push(`  font-weight: ${face.weight};`);
    if (face.style) out.push(`  font-style: ${face.style};`);
    out.push(`  font-display: ${face.display ?? "swap"};`);
    if (face.unicodeRange) out.push(`  unicode-range: ${face.unicodeRange};`);
    out.push("}");
    out.push("");
  }
  return out;
}

export type EmitBrandCssMode =
  /** Single-skin import / Create Center inject — also binds :root (global swap) */
  | "global"
  /** Multi-language catalog — only activates under html[data-brand] */
  | "scoped";

export interface EmitBrandCssOptions {
  /**
   * `global` (default): `:root` + `html[data-brand]` — one import recolors the app.
   * Single-mode dark packs also include `.dark`.
   * Dual-mode packs (`modes.light` + `modes.dark`) emit separate light/dark color blocks.
   * `scoped`: only `html[data-brand]` (+ `html.dark[data-brand]` when dual).
   */
  mode?: EmitBrandCssMode;
}

/** Global single-skin selector list — single-mode packs only. */
export function emitGlobalSkinSelector(brandId: string, darkDefault: boolean): string {
  if (darkDefault) {
    return `:root,\n.dark,\nhtml[data-brand="${brandId}"] {`;
  }
  return `:root,\nhtml[data-brand="${brandId}"] {`;
}

/** Light mode selector (dual-mode). */
export function emitLightModeSelector(brandId: string, mode: EmitBrandCssMode): string {
  if (mode === "scoped") return `html[data-brand="${brandId}"] {`;
  return `:root,\nhtml[data-brand="${brandId}"] {`;
}

/** Dark mode selector (dual-mode) — never paints light colors under .dark. */
export function emitDarkModeSelector(brandId: string, mode: EmitBrandCssMode): string {
  if (mode === "scoped") return `html.dark[data-brand="${brandId}"] {`;
  return `.dark,\nhtml.dark[data-brand="${brandId}"] {`;
}

function emitColorVars(s: BrandSemanticColors, r: BrandColorRoles | undefined): string[] {
  const roleLines: string[] = [
    `  /* ── Color roles (carrier) ── */`,
    `  --role-canvas: ${r?.canvas ?? s.background};`,
    `  --role-canvas-fg: ${r?.canvasForeground ?? s.foreground};`,
    `  --role-surface: ${r?.surface ?? s.card};`,
    `  --role-surface-fg: ${r?.surfaceForeground ?? s.cardForeground};`,
    `  --role-action: ${r?.action ?? s.primary};`,
    `  --role-action-fg: ${r?.actionForeground ?? s.primaryForeground};`,
    `  --role-quiet: ${r?.quiet ?? s.secondary};`,
    `  --role-quiet-fg: ${r?.quietForeground ?? s.secondaryForeground};`,
    `  --role-muted: ${r?.muted ?? s.muted};`,
    `  --role-muted-fg: ${r?.mutedForeground ?? s.mutedForeground};`,
    `  --role-border: ${r?.border ?? s.border};`,
    `  --role-input: ${r?.input ?? s.input ?? s.border};`,
    `  --role-ring: ${r?.ring ?? s.ring};`,
  ];
  if (r?.brand) {
    roleLines.push(`  --role-brand: ${r.brand};`);
    roleLines.push(
      `  --role-brand-fg: ${r.brandForeground ?? r.actionForeground ?? s.primaryForeground};`,
    );
    roleLines.push(`  --brand-mark: ${r.brand};`);
    roleLines.push(
      `  --brand-mark-foreground: ${r.brandForeground ?? r.actionForeground ?? s.primaryForeground};`,
    );
  }

  const semantic = [
    ``,
    `  /* ── shadcn bridge (primary = action CTA) ── */`,
    `  --background: ${s.background};`,
    `  --foreground: ${s.foreground};`,
    `  --card: ${s.card};`,
    `  --card-foreground: ${s.cardForeground};`,
    `  --popover: ${s.popover};`,
    `  --popover-foreground: ${s.popoverForeground};`,
    `  --primary: ${s.primary};`,
    `  --primary-foreground: ${s.primaryForeground};`,
    `  --secondary: ${s.secondary};`,
    `  --secondary-foreground: ${s.secondaryForeground};`,
    `  --muted: ${s.muted};`,
    `  --muted-foreground: ${s.mutedForeground};`,
    `  --accent: ${s.accent};`,
    `  --accent-foreground: ${s.accentForeground};`,
    `  --destructive: ${s.destructive};`,
    `  --destructive-foreground: ${s.destructiveForeground};`,
    `  --border: ${s.border};`,
    // Field stroke, not field fill: --input reaches the DOM only through
    // `border-input`. A language that omits it inherits the hairline colour,
    // which is always a visible boundary — writing the surface colour here
    // drew the outline in the same colour as what sits behind it.
    `  --input: ${s.input ?? s.border};`,
    `  --ring: ${s.ring};`,
  ];

  if (s.success) semantic.push(`  --success: ${s.success};`);
  if (s.successForeground) semantic.push(`  --success-foreground: ${s.successForeground};`);
  if (s.warning) semantic.push(`  --warning: ${s.warning};`);
  if (s.warningForeground) semantic.push(`  --warning-foreground: ${s.warningForeground};`);
  if (s.info) semantic.push(`  --info: ${s.info};`);
  if (s.infoForeground) semantic.push(`  --info-foreground: ${s.infoForeground};`);

  semantic.push(
    `  --sidebar: ${s.card};`,
    `  --sidebar-foreground: ${s.foreground};`,
    `  --sidebar-primary: ${s.primary};`,
    `  --sidebar-primary-foreground: ${s.primaryForeground};`,
    `  --sidebar-accent: ${s.accent};`,
    `  --sidebar-accent-foreground: ${s.accentForeground};`,
    `  --sidebar-border: ${s.border};`,
    `  --sidebar-ring: ${s.ring};`,
    `  --brand-gradient: hsl(var(--primary));`,
    `  --brand-gradient-reverse: hsl(var(--primary));`,
    `  --brand-gradient-vertical: hsl(var(--primary));`,
    `  --brand-gradient-radial: hsl(var(--primary));`,
  );

  return [...roleLines, ...semantic];
}

/**
 * Emit a single opt-in skin CSS file from a Brand Package.
 */
export function emitBrandCss(brand: BrandPackage, options: EmitBrandCssOptions = {}): string {
  const mode = options.mode ?? "global";
  const b = normalizeBrandPackage(brand);
  const t = b.typography;
  const dual = isDualModeBrand(b);

  const parts: string[] = [
    `/**`,
    ` * Brand carrier skin: ${b.name} (${b.id}) v${b.version}`,
    ` * darkDefault=${b.darkDefault} dualMode=${dual} button=${b.recipe.buttonDefault}`,
    ` * fonts=${t.faces?.length ?? 0} mode=${mode}`,
    ` * Contract: roles.action → --primary; roles.brand → --brand-mark (never default CTA)`,
    ` */`,
    ``,
    ...emitFontFaces(t.faces),
  ];

  // Biome CSS formatter prefers double-quoted font families.
  const fontSans = cssFontStack(t.fontSans);
  const fontDisplay = cssFontStack(t.fontDisplay ?? t.fontSans);
  const typeLines = [
    `  --font-sans: ${fontSans};`,
    `  --font-heading: ${fontDisplay};`,
    `  --font-display: ${fontDisplay};`,
  ];
  if (t.fontMono) typeLines.push(`  --font-mono: ${cssFontStack(t.fontMono)};`);
  if (t.headingWeight != null) {
    typeLines.push(`  --font-weight-heading: ${t.headingWeight};`);
  }

  const cats = b.extensions?.categories;
  const decorative = b.extensions?.decorative;
  const extLines: string[] = [];
  if (cats) {
    for (const [key, value] of Object.entries(cats)) {
      const safe = key.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      extLines.push(`  --brand-category-${safe}: ${value};`);
    }
  }
  if (decorative) {
    for (const [key, value] of Object.entries(decorative)) {
      const safe = key.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      extLines.push(`  --brand-decorative-${safe}: ${value};`);
    }
  }

  const sharedChrome = [
    ``,
    `  /* Recipe (action language + free elev/radii) */`,
    ...recipeVars(b.recipe),
    ``,
    `  /* Typography */`,
    ...typeLines,
    ...motionVars(b.motion),
    ...spacingVars(b.spacing),
    ...(extLines.length
      ? ["", "  /* Taxonomy / decorative (not product CTA) */", ...extLines]
      : []),
  ];

  if (dual && b.modes?.light?.semantic && b.modes?.dark?.semantic) {
    // Light block: colors + shared chrome
    parts.push(emitLightModeSelector(b.id, mode));
    parts.push(
      ...emitColorVars(b.modes.light.semantic, b.modes.light.roles),
      ...sharedChrome,
      `}`,
      ``,
    );
    // Dark block: colors only (chrome inherits)
    parts.push(emitDarkModeSelector(b.id, mode));
    parts.push(...emitColorVars(b.modes.dark.semantic, b.modes.dark.roles), `}`, ``);
  } else {
    // Single-mode: one selector + full block
    const selector =
      mode === "scoped"
        ? `html[data-brand="${b.id}"] {`
        : emitGlobalSkinSelector(b.id, b.darkDefault);
    parts.push(selector);
    parts.push(...emitColorVars(b.semantic, b.roles), ...sharedChrome, `}`, ``);
  }

  return parts.join("\n");
}
