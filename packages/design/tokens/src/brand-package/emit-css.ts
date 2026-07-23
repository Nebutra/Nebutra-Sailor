/**
 * Emit carrier CSS from a normalized Brand Package.
 * Components bind: --primary (= action), --brand-mark, --elevation-*, --radius-*.
 */

import { normalizeBrandPackage } from "./normalize";
import type {
  BrandFontFace,
  BrandPackage,
  BrandRecipe,
  BrandTypeStep,
  BrandZones,
  BrandZoneTypography,
} from "./types";

function recipeVars(recipe: BrandRecipe): string[] {
  const radii = recipe.radii ?? {
    button: recipe.buttonRadius ?? "0.375rem",
    card: recipe.cardRadius ?? "0.75rem",
  };
  const elev = recipe.elevationTokens ?? {
    card: "var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))",
    control: "var(--shadow-xs, 0 1px 2px 0 rgb(0 0 0 / 0.04))",
    raised: "var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))",
  };

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
    // Kill Tailwind drop defaults when brand uses custom elev stacks
    `  --shadow-xs: ${elev.control ?? "0 0 #0000"};`,
    `  --shadow-sm: ${elev.card};`,
    `  --shadow-md: ${elev.raised ?? elev.card};`,
    `  --shadow-lg: ${elev.raised ?? elev.card};`,
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
      lines.push("  --btn-default-stroke-gradient: transparent;");
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
    lines.push("  --control-font-size-md: 0.8125rem;");
  } else if (recipe.density === "spacious") {
    lines.push("  --btn-default-padding-y: 0.875rem;");
    lines.push("  --btn-default-padding-x: 1.5rem;");
    lines.push("  --control-height-tiny: 1.75rem;");
    lines.push("  --control-height-sm: 2.25rem;");
    lines.push("  --control-height-md: 2.75rem;");
    lines.push("  --control-height-lg: 3.25rem;");
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

function stepVars(prefix: string, step: BrandTypeStep | undefined, role: string): string[] {
  if (!step) return [];
  const lines = [`  --${prefix}-${role}-size: ${step.fontSize};`];
  if (step.lineHeight != null) lines.push(`  --${prefix}-${role}-leading: ${step.lineHeight};`);
  if (step.letterSpacing != null) {
    lines.push(`  --${prefix}-${role}-tracking: ${step.letterSpacing};`);
  }
  if (step.fontWeight != null) lines.push(`  --${prefix}-${role}-weight: ${step.fontWeight};`);
  return lines;
}

function zoneScaleVars(
  zone: "product" | "marketing",
  scale: BrandZoneTypography | undefined,
): string[] {
  if (!scale) return [];
  const p = `zone-${zone}`;
  return [
    ...stepVars(p, scale.caption, "caption"),
    ...stepVars(p, scale.bodySm, "body-sm"),
    ...stepVars(p, scale.body, "body"),
    ...stepVars(p, scale.bodyLg, "body-lg"),
    ...stepVars(p, scale.subheading, "subheading"),
    ...stepVars(p, scale.headingSm, "heading-sm"),
    ...stepVars(p, scale.heading, "heading"),
    ...stepVars(p, scale.headingLg, "heading-lg"),
    ...stepVars(p, scale.display, "display"),
  ];
}

function zoneConsumerBlock(
  zone: "product" | "marketing",
  scale: BrandZoneTypography | undefined,
): string[] {
  if (!scale) return [];
  const p = `zone-${zone}`;
  const body = scale.body;
  const lines = [
    ``,
    `/* Zone: ${zone} — product never inherits marketing display */`,
    `[data-zone="${zone}"], .zone-${zone} {`,
  ];
  if (body?.fontSize) lines.push(`  font-size: var(--${p}-body-size, ${body.fontSize});`);
  if (body?.lineHeight != null) {
    lines.push(`  line-height: var(--${p}-body-leading, ${body.lineHeight});`);
  }
  if (body?.fontWeight != null) {
    lines.push(`  font-weight: var(--${p}-body-weight, ${body.fontWeight});`);
  }
  if (body?.letterSpacing != null) {
    lines.push(`  letter-spacing: var(--${p}-body-tracking, ${body.letterSpacing});`);
  }
  const roles = [
    "caption",
    "body-sm",
    "body",
    "body-lg",
    "subheading",
    "heading-sm",
    "heading",
    "heading-lg",
    "display",
  ] as const;
  for (const role of roles) {
    lines.push(`  --text-${role}: var(--${p}-${role}-size, inherit);`);
    lines.push(`  --leading-${role}: var(--${p}-${role}-leading, inherit);`);
    lines.push(`  --tracking-${role}: var(--${p}-${role}-tracking, inherit);`);
  }
  // Product zone hard-cap: display falls back to heading if not set for product
  if (zone === "product") {
    lines.push(`  --text-display: var(--${p}-display-size, var(--${p}-heading-size, inherit));`);
  }
  lines.push(`}`);
  return lines;
}

function emitZones(zones: BrandZones | undefined): string[] {
  if (!zones) return [];
  return [
    ``,
    `  /* Zone type scales */`,
    ...zoneScaleVars("product", zones.product),
    ...zoneScaleVars("marketing", zones.marketing),
  ];
}

export type EmitBrandCssMode =
  /** Single-skin import / Create Center inject — also binds :root (global swap) */
  | "global"
  /** Multi-language catalog — only activates under html[data-brand] */
  | "scoped";

export interface EmitBrandCssOptions {
  /**
   * `global` (default): `:root, .dark, html[data-brand]` — one import recolors the app.
   * `scoped`: only `html[data-brand]` — safe to concatenate many skins in a catalog.
   */
  mode?: EmitBrandCssMode;
}

/**
 * Emit a single opt-in skin CSS file from a Brand Package.
 */
export function emitBrandCss(brand: BrandPackage, options: EmitBrandCssOptions = {}): string {
  const mode = options.mode ?? "global";
  const b = normalizeBrandPackage(brand);
  const s = b.semantic;
  const r = b.roles;
  const t = b.typography;
  const selector =
    mode === "scoped"
      ? `html[data-brand="${b.id}"] {`
      : `:root,\n.dark,\nhtml[data-brand="${b.id}"] {`;
  const parts: string[] = [
    `/**`,
    ` * Brand carrier skin: ${b.name} (${b.id}) v${b.version}`,
    ` * darkDefault=${b.darkDefault} action≠brand-mark button=${b.recipe.buttonDefault}`,
    ` * fonts=${t.faces?.length ?? 0} zones=${b.zones ? "yes" : "no"} mode=${mode}`,
    ` * Contract: roles.action → --primary; roles.brand → --brand-mark (never default CTA)`,
    ` */`,
    ``,
    ...emitFontFaces(t.faces),
    selector,
  ];

  // Color roles (canonical)
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
    `  --role-input: ${r?.input ?? s.input};`,
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

  // shadcn bridge — primary = ACTION only
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
    `  --input: ${s.input};`,
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
    // Product gradient aliases solid action — not logo multi-hue
    `  --brand-gradient: hsl(var(--primary));`,
    `  --brand-gradient-reverse: hsl(var(--primary));`,
    `  --brand-gradient-vertical: hsl(var(--primary));`,
    `  --brand-gradient-radial: hsl(var(--primary));`,
  );

  const typeLines = [
    `  --font-sans: ${t.fontSans};`,
    `  --font-heading: ${t.fontDisplay ?? t.fontSans};`,
    `  --font-display: ${t.fontDisplay ?? t.fontSans};`,
  ];
  if (t.fontMono) typeLines.push(`  --font-mono: ${t.fontMono};`);
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
      // Marketing zone only — never alias to --primary
      extLines.push(`  --brand-decorative-${safe}: ${value};`);
    }
  }

  parts.push(
    ...roleLines,
    ...semantic,
    ``,
    `  /* Recipe (action language + free elev/radii) */`,
    ...recipeVars(b.recipe),
    ``,
    `  /* Typography */`,
    ...typeLines,
    ...emitZones(b.zones),
    ...(extLines.length
      ? ["", "  /* Taxonomy / decorative (not product CTA) */", ...extLines]
      : []),
    `}`,
    ``,
    ...zoneConsumerBlock("product", b.zones?.product),
    ...zoneConsumerBlock("marketing", b.zones?.marketing),
    ``,
    `/* Product chrome must not use decorative gradients as action fills */`,
    `[data-zone="product"] .btn-brand-default,`,
    `.zone-product .btn-brand-default {`,
    `  /* intentional no-op: documents contract; action uses --primary only */`,
    `}`,
    ``,
  );

  return parts.join("\n");
}
