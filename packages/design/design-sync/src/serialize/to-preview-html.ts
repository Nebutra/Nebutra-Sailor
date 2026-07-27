/**
 * DTCG → preview.html serializer
 *
 * Converts an array of W3C DTCG token sets into a self-contained, dependency-free
 * HTML document that visually renders the design system:
 *
 *   - Header with the design-system name
 *   - Color swatches (name + resolved hex) for all brand/status roles
 *   - Typography samples (h1 / body / label) using the resolved font family
 *   - Component samples (button, card, input) built with resolved tokens
 *   - Radius scale
 *   - Light + dark rendering via CSS `prefers-color-scheme` + `[data-theme="dark"]`
 *
 * PURE: no filesystem I/O, no @google/design.md dependency.
 * Only imports from `../types`, `./to-design-md.resolve`, and `./to-preview-html.template`.
 */

import type { DesignTokenSet } from "../types";
import {
  buildIndex,
  buildIndexForSet,
  buildRounded,
  buildTypography,
  type ResolvedColors,
  resolveColorRoles,
} from "./to-design-md.resolve";
import {
  buildDocument,
  type CssVarBlock,
  cssAttrValue,
  escapeHtml,
} from "./to-preview-html.template";

// ─── Public API ────────────────────────────────────────────────────────────────

export interface ToPreviewHtmlOptions {
  /**
   * Design system name written into the exported artefact.
   *
   * Defaults to a generic label on purpose: this package is provider-agnostic
   * and has no brand of its own, so naming one here would stamp it onto every
   * downstream design system that did not pass this option.
   */
  name?: string;
  /**
   * Name of a theme token set (e.g. "themes/light") whose
   * `color.background` and `color.foreground` tokens are used for the light
   * mode CSS custom properties.
   */
  theme?: string;
  /**
   * Name of the dark-theme token set (e.g. "themes/dark").
   * Defaults to the set named exactly "themes/dark".
   * If not found, light values are used for dark mode (preview still renders).
   */
  darkTheme?: string;
}

/**
 * Serialize an array of DTCG token sets into a self-contained HTML preview.
 *
 * @param sets    All token sets to merge (e.g. core + semantic + theme).
 * @param options Optional overrides for name, theme, and darkTheme.
 * @returns A deterministic, self-contained HTML string.
 */
export function serializeToPreviewHtml(
  sets: DesignTokenSet[],
  options?: ToPreviewHtmlOptions,
): string {
  const name = options?.name ?? "Design System";
  const escapedName = escapeHtml(name);

  // 1. Build flat indexes
  const index = buildIndex(sets);
  const themeIndex =
    options?.theme != null
      ? buildIndexForSet(sets.find((s) => s.name === options.theme)?.tokens ?? {})
      : new Map();

  // Find dark theme set: honour explicit darkTheme option, then fall back to
  // the set named exactly "themes/dark".  Do NOT fall through to arbitrary
  // themes/* sets — that caused silent mis-detection.
  const darkThemeName = options?.darkTheme ?? "themes/dark";
  const darkThemeSet = sets.find((s) => s.name === darkThemeName);
  const darkThemeIndex = darkThemeSet != null ? buildIndexForSet(darkThemeSet.tokens) : themeIndex;

  // 2. Resolve tokens
  const { roles: resolvedLightColors } = resolveColorRoles(index, themeIndex);
  const { roles: resolvedDarkColors } = resolveColorRoles(index, darkThemeIndex);
  const typography = buildTypography(index);
  const rounded = buildRounded(index);

  // 3. Build CSS variable blocks (all fields guaranteed present via ?? defaults)
  const lightVars = buildCssVars(resolvedLightColors, "light");
  const darkVars = buildCssVars(resolvedDarkColors, "dark");

  // 4. Build content sections (use lightVars — CssVarBlock with guaranteed strings)
  const swatchesHtml = buildSwatches(lightVars);
  const typographyHtml = buildTypographySection(typography);
  const componentsHtml = buildComponentsSection(lightVars, typography, rounded);
  const radiusHtml = buildRadiusSection(rounded);

  return buildDocument({
    escapedName,
    lightVars,
    darkVars,
    swatchesHtml,
    typographyHtml,
    componentsHtml,
    radiusHtml,
  });
}

// ─── CSS variable builder ──────────────────────────────────────────────────────

function buildCssVars(colors: ResolvedColors["roles"], _mode: "light" | "dark"): CssVarBlock {
  return {
    primary: colors.primary ?? "#0033fe",
    accent: colors.accent ?? "#0bf1c3",
    tertiary: colors.tertiary ?? "#8b5cf6",
    danger: colors.danger ?? "#ef4444",
    warning: colors.warning ?? "#f59e0b",
    success: colors.success ?? "#22c55e",
    background: colors.background ?? (_mode === "light" ? "#ffffff" : "#0a0a0a"),
    foreground: colors.foreground ?? (_mode === "light" ? "#0f172a" : "#fafafa"),
  };
}

// ─── Section builders ──────────────────────────────────────────────────────────

const COLOR_ROLE_LABELS: Array<[keyof CssVarBlock, string]> = [
  ["primary", "Primary"],
  ["accent", "Accent"],
  ["tertiary", "Tertiary"],
  ["danger", "Danger"],
  ["warning", "Warning"],
  ["success", "Success"],
  ["background", "Background"],
  ["foreground", "Foreground"],
];

function buildSwatches(colors: CssVarBlock): string {
  const items = COLOR_ROLE_LABELS.map(([role, label]) => {
    const hex = colors[role];
    const textColor = isLightColor(hex) ? "#0a0a0a" : "#ffffff";
    return `
      <div class="swatch">
        <div class="swatch-color" style="background:${hex};color:${textColor};">
          <span class="swatch-hex">${escapeHtml(hex)}</span>
        </div>
        <div class="swatch-label">${escapeHtml(label)}</div>
      </div>`;
  }).join("\n");

  return `<section class="preview-section">
  <h2 class="section-title">Colors</h2>
  <div class="swatch-grid">
    ${items}
  </div>
</section>`;
}

/** Naively estimates whether a hex color is light (for contrast text). */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5;
}

function buildTypographySection(typography: ReturnType<typeof buildTypography>): string {
  const samples = Object.entries(typography)
    .map(([variant, entry]) => {
      const tag = variant === "h1" ? "h1" : "p";
      const sampleText =
        variant === "h1"
          ? "The quick brown fox"
          : variant === "body-md"
            ? "Body text — the quick brown fox jumps over the lazy dog."
            : "label / mono sample";

      return `
    <div class="type-sample">
      <div class="type-meta">${escapeHtml(variant)} &mdash; ${escapeHtml(entry.fontSize)} &mdash; ${escapeHtml(entry.fontFamily)}</div>
      <${tag} class="type-preview" style="font-family:${cssAttrValue(entry.fontFamily)};font-size:${cssAttrValue(entry.fontSize)};margin:0;">${escapeHtml(sampleText)}</${tag}>
    </div>`;
    })
    .join("\n");

  return `<section class="preview-section">
  <h2 class="section-title">Typography</h2>
  <div class="type-stack">
    ${samples}
  </div>
</section>`;
}

function buildComponentsSection(
  colors: CssVarBlock,
  typography: ReturnType<typeof buildTypography>,
  rounded: ReturnType<typeof buildRounded>,
): string {
  const fontFamily = cssAttrValue(typography["body-md"]?.fontFamily ?? "system-ui, sans-serif");
  const radius = cssAttrValue(rounded["md"] ?? rounded["sm"] ?? "0.375rem");
  const radiusLg = cssAttrValue(rounded["lg"] ?? rounded["md"] ?? "0.5rem");

  const buttonHtml = `
    <div class="component-item">
      <div class="component-label">Primary Button</div>
      <button type="button" style="
        background:${colors.primary};
        color:#ffffff;
        border:none;
        border-radius:${radius};
        padding:0.5rem 1.25rem;
        font-family:${fontFamily};
        font-size:0.875rem;
        font-weight:600;
        cursor:pointer;
      ">Get Started</button>
    </div>`;

  const outlineButtonHtml = `
    <div class="component-item">
      <div class="component-label">Outline Button</div>
      <button type="button" style="
        background:transparent;
        color:${colors.primary};
        border:1.5px solid ${colors.primary};
        border-radius:${radius};
        padding:0.5rem 1.25rem;
        font-family:${fontFamily};
        font-size:0.875rem;
        font-weight:600;
        cursor:pointer;
      ">Secondary</button>
    </div>`;

  const cardHtml = `
    <div class="component-item">
      <div class="component-label">Card</div>
      <div style="
        background:var(--preview-bg);
        border:1px solid rgba(0,0,0,0.1);
        border-radius:${radiusLg};
        padding:1rem 1.25rem;
        font-family:${fontFamily};
        max-width:220px;
        box-shadow:0 1px 3px rgba(0,0,0,0.08);
      ">
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.25rem;">Card Title</div>
        <div style="font-size:0.8rem;opacity:0.7;">Card body text — semantic tokens applied.</div>
      </div>
    </div>`;

  const inputHtml = `
    <div class="component-item">
      <div class="component-label">Input</div>
      <input
        data-allow-native
        type="text"
        placeholder="Placeholder text…"
        style="
          background:var(--preview-bg);
          color:var(--preview-fg);
          border:1.5px solid rgba(0,0,0,0.18);
          border-radius:${radius};
          padding:0.5rem 0.75rem;
          font-family:${fontFamily};
          font-size:0.875rem;
          outline:none;
          width:200px;
        "
      />
    </div>`;

  const badgeHtml = `
    <div class="component-item">
      <div class="component-label">Status Badges</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <span style="background:${colors.success};color:#fff;border-radius:999px;padding:0.2rem 0.6rem;font-size:0.7rem;font-weight:600;font-family:${fontFamily};">Success</span>
        <span style="background:${colors.warning};color:#fff;border-radius:999px;padding:0.2rem 0.6rem;font-size:0.7rem;font-weight:600;font-family:${fontFamily};">Warning</span>
        <span style="background:${colors.danger};color:#fff;border-radius:999px;padding:0.2rem 0.6rem;font-size:0.7rem;font-weight:600;font-family:${fontFamily};">Danger</span>
      </div>
    </div>`;

  return `<section class="preview-section">
  <h2 class="section-title">Components</h2>
  <div class="component-grid">
    ${buttonHtml}
    ${outlineButtonHtml}
    ${cardHtml}
    ${inputHtml}
    ${badgeHtml}
  </div>
</section>`;
}

function buildRadiusSection(rounded: ReturnType<typeof buildRounded>): string {
  const entries = Object.entries(rounded);

  if (entries.length === 0) {
    return `<section class="preview-section">
  <h2 class="section-title">Radius Scale</h2>
  <p style="opacity:0.6;font-size:0.875rem;">No radius tokens found in the provided token sets.</p>
</section>`;
  }

  const items = entries
    .map(
      ([key, value]) => `
    <div class="radius-item">
      <div class="radius-demo" style="border-radius:${cssAttrValue(value)};"></div>
      <div class="radius-name">${escapeHtml(key)}</div>
      <div class="radius-value">${escapeHtml(value)}</div>
    </div>`,
    )
    .join("\n");

  return `<section class="preview-section">
  <h2 class="section-title">Radius Scale</h2>
  <div class="radius-grid">
    ${items}
  </div>
</section>`;
}
