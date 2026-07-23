import type {
  BrandFontFace,
  BrandPackage,
  BrandRecipe,
  BrandTypeStep,
  BrandZones,
  BrandZoneTypography,
} from "./types";

function recipeButtonVars(recipe: BrandRecipe): string[] {
  const radius = recipe.buttonRadius;
  const lines: string[] = [
    `  --btn-default-radius: ${radius};`,
    `  --radius-button: ${radius};`,
    `  --radius-buttons: ${radius};`,
    `  --radius-md: ${radius};`,
    `  --radius-card: ${recipe.cardRadius};`,
    `  --radius-lg: ${recipe.cardRadius};`,
  ];

  if (recipe.elevation === "none") {
    const none = "0 0 #0000";
    lines.push(`  --btn-default-shadow: ${none};`);
    lines.push(`  --shadow-xs: ${none};`);
    lines.push(`  --shadow-sm: ${none};`);
    lines.push(`  --shadow-md: ${none};`);
    lines.push(`  --shadow-lg: ${none};`);
    lines.push(`  --elevation-card: ${none};`);
    lines.push(`  --elevation-control: ${none};`);
    lines.push(`  --elevation-raised: ${none};`);
  }

  switch (recipe.buttonDefault) {
    case "outline": {
      const edge = recipe.outlineBorder ?? "hsl(var(--foreground))";
      lines.push("  --btn-default-bg: transparent;");
      lines.push("  --btn-default-fg: hsl(var(--foreground));");
      lines.push(`  --btn-default-border-width: 1px;`);
      lines.push(`  --btn-default-border: transparent;`);
      lines.push(`  --btn-default-stroke-gradient: linear-gradient(${edge}, ${edge});`);
      lines.push("  --btn-default-hover-bg: hsl(var(--foreground) / 0.06);");
      // Badge tracks outline language
      lines.push("  --badge-default-bg: transparent;");
      lines.push("  --badge-default-fg: hsl(var(--foreground));");
      lines.push(`  --badge-default-border: ${edge};`);
      lines.push("  --badge-default-hover-bg: hsl(var(--foreground) / 0.06);");
      break;
    }
    case "gradient-stroke": {
      const grad =
        recipe.primaryStrokeGradient ??
        "linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 55%, white))";
      const edge = recipe.outlineBorder ?? "hsl(var(--foreground))";
      lines.push("  --btn-default-bg: transparent;");
      lines.push("  --btn-default-fg: hsl(var(--foreground));");
      lines.push("  --btn-default-border-width: 1.5px;");
      lines.push("  --btn-default-border: transparent;");
      lines.push(`  --btn-default-stroke-gradient: ${grad};`);
      lines.push("  --btn-default-hover-bg: hsl(var(--primary) / 0.08);");
      lines.push("  --badge-default-bg: transparent;");
      lines.push("  --badge-default-fg: hsl(var(--foreground));");
      lines.push(`  --badge-default-border: ${edge};`);
      lines.push("  --badge-default-hover-bg: hsl(var(--primary) / 0.08);");
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
      lines.push("  --badge-default-bg: hsl(var(--primary));");
      lines.push("  --badge-default-fg: hsl(var(--primary-foreground));");
      lines.push("  --badge-default-border: transparent;");
      lines.push(
        "  --badge-default-hover-bg: color-mix(in srgb, hsl(var(--primary)) 80%, transparent);",
      );
      break;
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
    `/* Zone: ${zone} — apply via data-zone="${zone}" or .zone-${zone} */`,
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
  // Expose role tokens for descendants
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
  lines.push(`}`);
  return lines;
}

function emitZones(zones: BrandZones | undefined): string[] {
  if (!zones) return [];
  const rootVars = [
    ``,
    `  /* Zone type scales (product shell vs marketing) */`,
    ...zoneScaleVars("product", zones.product),
    ...zoneScaleVars("marketing", zones.marketing),
  ];
  return rootVars;
}

/**
 * Emit a single opt-in skin CSS file from a Brand Package.
 * Includes @font-face, semantic/recipe vars, and product/marketing zones.
 */
export function emitBrandCss(brand: BrandPackage): string {
  const s = brand.semantic;
  const t = brand.typography;
  const parts: string[] = [
    `/**`,
    ` * Brand skin: ${brand.name} (${brand.id}) v${brand.version}`,
    ` * darkDefault=${brand.darkDefault} buttonDefault=${brand.recipe.buttonDefault}`,
    ` * fonts=${t.faces?.length ?? 0} zones=${brand.zones ? "product+marketing" : "none"}`,
    ` */`,
    ``,
    ...emitFontFaces(t.faces),
    `:root,`,
    `.dark,`,
    `html[data-brand="${brand.id}"] {`,
  ];

  const semantic = [
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

  const cats = brand.extensions?.categories;
  const extLines: string[] = [];
  if (cats) {
    for (const [key, value] of Object.entries(cats)) {
      const safe = key.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      extLines.push(`  --brand-category-${safe}: ${value};`);
    }
  }

  parts.push(
    ...semantic,
    ``,
    `  /* Recipe */`,
    ...recipeButtonVars(brand.recipe),
    ``,
    `  /* Typography stacks */`,
    ...typeLines,
    ...emitZones(brand.zones),
    ...(extLines.length ? ["", "  /* Extensions */", ...extLines] : []),
    `}`,
    ``,
    ...zoneConsumerBlock("product", brand.zones?.product),
    ...zoneConsumerBlock("marketing", brand.zones?.marketing),
    ``,
  );

  return parts.join("\n");
}
