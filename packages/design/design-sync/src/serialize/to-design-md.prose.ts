/**
 * DTCG → DESIGN.md prose layer
 *
 * Contains the markdown prose builder (`buildProse`) and all section helpers.
 * Imported by `to-design-md.ts`; do NOT import this file directly in app code.
 */

// ─── Internal types (shared with to-design-md.ts) ─────────────────────────────

export interface ColorRoles {
  primary?: string;
  accent?: string;
  tertiary?: string;
  danger?: string;
  warning?: string;
  success?: string;
  background?: string;
  foreground?: string;
}

/** Per-role descriptions sourced from the source semantic token's $description field. */
export type ColorDescriptions = Partial<Record<keyof ColorRoles, string>>;

export interface TypographyEntry {
  fontFamily: string;
  fontSize: string;
}

export interface TypographyMap {
  h1: TypographyEntry;
  "body-md": TypographyEntry;
  label: TypographyEntry;
}

export interface RoundedMap {
  [key: string]: string;
}

export interface SpacingMap {
  [key: string]: string;
}

export interface ContainerInfo {
  text?: string;
  content?: string;
  wide?: string;
}

export interface ProseArgs {
  name: string;
  /** Optional custom description. When provided, replaces the default Nebutra Overview paragraph. */
  description?: string;
  colors: ColorRoles;
  colorDescriptions: ColorDescriptions;
  typography: TypographyMap;
  rounded: RoundedMap;
  containers: ContainerInfo;
}

// ─── Stable color key order (used by both front-matter and prose) ─────────────

export const COLOR_ORDER: Array<keyof ColorRoles> = [
  "primary",
  "accent",
  "tertiary",
  "danger",
  "warning",
  "success",
  "background",
  "foreground",
];

// ─── Governance list (exported for consumers who want to inspect the rules) ────

export const DESIGN_MD_GOVERNANCE = {
  dos: [
    "Use semantic tokens / CSS variables (`bg-primary`, `text-foreground`, `border-border`) — never raw hex values.",
    "Use the brand gradient (135° blue→cyan) for primary CTAs and gradient text effects.",
    "Use `AnimateIn` presets for entrance animations; never use raw `motion.div` with hardcoded transition values.",
    "Constrain layouts to the container width tiers; use the wide (1400px) container for feature sections.",
    "Give icon-only buttons an `aria-label`; rely on the global `:focus-visible` ring — do not add component-level focus rings.",
  ],
  donts: [
    "Don't hardcode brand or status hex values in components — use token aliases (`var(--brand-primary)`, etc.).",
    "Don't use `max-w-5xl` or `max-w-7xl` for feature sections — use the wide container (`max-w-[1400px]`).",
    "Don't reintroduce hardcoded focus rings (they double-render with the global `:focus-visible` rule).",
    "Don't use raw form controls (`<input>`, `<select>`, `<textarea>`) in app surfaces — use the primitives from `@nebutra/ui/primitives`.",
  ],
} as const;

// ─── Prose builder ────────────────────────────────────────────────────────────

export function buildProse(args: ProseArgs): string {
  const sections: string[] = [];

  sections.push(buildOverview(args.name, args.description));
  sections.push(buildColors(args.colors, args.colorDescriptions));
  sections.push(buildTypographySection(args.typography));
  sections.push(buildLayout(args.containers));
  sections.push(buildElevation());
  sections.push(buildShapes(args.rounded));
  sections.push(buildComponents());
  sections.push(buildDosDonts());

  return "\n" + sections.join("\n\n") + "\n";
}

// ─── Section helpers ──────────────────────────────────────────────────────────

function buildOverview(name: string, description?: string): string {
  const paragraph =
    description ??
    `${name} is an AI-native SaaS design system built on the 云毓蓝 blue (#0033fe) → 云毓青 cyan (#0bf1c3) brand palette. ` +
      `It targets Vercel/Geist visual parity, enforces semantic tokens over raw hex values, and ships with ` +
      `a token-first architecture (DTCG W3C draft) that drives CSS variables, Tailwind utilities, and the Style Dictionary pipeline.`;

  return `## Overview\n\n${paragraph}`;
}

const COLOR_LABELS: Record<keyof ColorRoles, string> = {
  primary: "Primary",
  accent: "Accent",
  tertiary: "Tertiary",
  danger: "Danger",
  warning: "Warning",
  success: "Success",
  background: "Background",
  foreground: "Foreground",
};

function buildColors(colors: ColorRoles, colorDescriptions: ColorDescriptions): string {
  const colorLines: string[] = [];

  for (const key of COLOR_ORDER) {
    const hex = colors[key];
    if (!hex) continue;
    const label = COLOR_LABELS[key];
    const desc = colorDescriptions[key];
    colorLines.push(`- **${label}** (\`${hex}\`)${desc ? ` — ${desc}` : ""}`);
  }

  return (
    `## Colors\n\n` + (colorLines.length > 0 ? colorLines.join("\n") : "_No color roles resolved._")
  );
}

function buildTypographySection(typography: TypographyMap): string {
  const typLines: string[] = [];
  for (const [variant, entry] of Object.entries(typography)) {
    typLines.push(`- **${variant}**: \`${entry.fontSize}\` — ${entry.fontFamily}`);
  }
  return `## Typography\n\n` + typLines.join("\n");
}

function buildLayout(containers: ContainerInfo): string {
  const containerLines: string[] = [];

  if (containers.text) {
    containerLines.push(
      `- **text** (\`${containers.text}\`) — Reading-focused: hero copy, FAQ, article body`,
    );
  }
  if (containers.content) {
    containerLines.push(
      `- **content** (\`${containers.content}\`) — Pricing tables, blog index, architecture diagrams`,
    );
  }
  if (containers.wide) {
    containerLines.push(
      `- **wide** (\`${containers.wide}\`) — Feature bento grids, testimonials, product demo sections, navbar`,
    );
  }

  const layoutBody =
    containerLines.length > 0
      ? `Three container-width tiers constrain layout density:\n\n` + containerLines.join("\n")
      : `Use the \`--container-text\`, \`--container-content\`, and \`--container-wide\` CSS variables for layout constraints.`;

  return `## Layout\n\n` + layoutBody;
}

function buildElevation(): string {
  return (
    `## Elevation & Depth\n\n` +
    `Elevation is expressed as layered box-shadows (xs → 2xl) plus brand-tinted glow variants (\`brand\`, \`brand-lg\`). ` +
    `No structured elevation token is emitted in this DESIGN.md because the current DESIGN.md specification ` +
    `has no elevation token type (this is a documented spec gap). ` +
    `Consume shadows via the \`elevation.*\` token set in the DTCG source files or the ` +
    `Tailwind \`shadow-*\` utilities mapped from those tokens.`
  );
}

function buildShapes(rounded: RoundedMap): string {
  const roundedKeys = Object.keys(rounded);
  const shapeBody =
    roundedKeys.length > 0
      ? `Border-radius follows a named scale: ${roundedKeys.map((k) => `**${k}** (\`${rounded[k]}\`)`).join(", ")}. ` +
        `Use \`size.radius.*\` tokens — never hardcode \`border-radius\` values.`
      : `Border-radius follows the \`size.radius.*\` token scale. Use named tokens, never hardcode values.`;

  return `## Shapes\n\n` + shapeBody;
}

function buildComponents(): string {
  return (
    `## Components\n\n` +
    `No structured component tokens are emitted in DESIGN.md v1 (avoids contrast-lint risk without full component token coverage). ` +
    `Component rules live in the Storybook \`@nebutra/ui\` library and the \`@nebutra/tokens\` CSS variable sheet. ` +
    `All interactive components must use \`@nebutra/ui/primitives\` form controls — raw \`<input>\`/\`<select>\`/\`<textarea>\` ` +
    `are banned in \`apps/**\` (lint-enforced via \`scripts/lint-no-raw-inputs.mjs\`).`
  );
}

function buildDosDonts(): string {
  const doSection = DESIGN_MD_GOVERNANCE.dos.map((d) => `- ✓ ${d}`).join("\n");
  const dontSection = DESIGN_MD_GOVERNANCE.donts.map((d) => `- ✗ ${d}`).join("\n");
  return `## Do's and Don'ts\n\n### Do\n\n${doSection}\n\n### Don't\n\n${dontSection}`;
}
