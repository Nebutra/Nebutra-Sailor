/**
 * Font Configuration and Loading Utilities
 *
 * Handles web font loading, preloading, and performance optimization.
 */

// ============================================
// Font Definitions
// ============================================

/**
 * Font configuration object
 */
export interface FontConfig {
  /** Font family name */
  family: string;
  /** Font weights to load */
  weights: number[];
  /** Include italic variants */
  italic?: boolean;
  /** Font display strategy */
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  /** Is this a variable font */
  variable?: boolean;
  /** Google Fonts URL parameter name */
  googleFontsParam?: string;
  /** Self-hosted font URL */
  selfHostUrl?: string;
  /** Font license */
  license: "OFL" | "Apache-2.0" | "Ubuntu" | "MIT" | "Other";
  /** Source URL for license */
  licenseUrl?: string;
}

/**
 * Registered fonts for the design system
 */
export const fonts: Record<string, FontConfig> = {
  inter: {
    family: "Inter",
    weights: [300, 400, 500, 600, 700],
    italic: false,
    display: "swap",
    variable: true,
    googleFontsParam: "Inter:wght@300;400;500;600;700",
    license: "OFL",
    licenseUrl: "https://github.com/rsms/inter/blob/master/LICENSE.txt",
  },

  publicSans: {
    family: "Public Sans",
    weights: [300, 400, 500, 600, 700],
    italic: true,
    display: "swap",
    variable: true,
    googleFontsParam: "Public+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500",
    license: "OFL",
    licenseUrl: "https://github.com/uswds/public-sans/blob/develop/LICENSE.md",
  },

  jetbrainsMono: {
    family: "JetBrains Mono",
    weights: [400, 500, 700],
    italic: false,
    display: "swap",
    variable: true,
    googleFontsParam: "JetBrains+Mono:wght@400;500;700",
    license: "OFL",
    licenseUrl: "https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt",
  },

  sourceHanSans: {
    family: "Noto Sans SC",
    weights: [400, 500, 700],
    italic: false,
    display: "swap",
    variable: false,
    googleFontsParam: "Noto+Sans+SC:wght@400;500;700",
    license: "OFL",
    licenseUrl: "https://github.com/adobe-fonts/source-han-sans/blob/master/LICENSE.txt",
  },
};

// ============================================
// Google Fonts URL Builder
// ============================================

/**
 * Generate Google Fonts URL for specified fonts
 */
export function getGoogleFontsUrl(fontKeys: (keyof typeof fonts)[]): string {
  const families = fontKeys
    .map((key) => fonts[key]?.googleFontsParam)
    .filter(Boolean)
    .join("&family=");

  if (!families) return "";

  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

/**
 * Default fonts to load
 */
export const defaultFonts: (keyof typeof fonts)[] = ["inter", "jetbrainsMono"];

/**
 * Fonts for CJK (Chinese) support
 */
export const cjkFonts: (keyof typeof fonts)[] = ["sourceHanSans"];

/**
 * All fonts including CJK
 */
export const allFonts: (keyof typeof fonts)[] = [...defaultFonts, ...cjkFonts];

// ============================================
// Font Loading Utilities
// ============================================

/**
 * Generate preload link elements for critical fonts
 */
export function getFontPreloadLinks(fontKeys: (keyof typeof fonts)[]): string[] {
  return fontKeys
    .map((key) => {
      const font = fonts[key];
      if (!font) return "";

      const url = getGoogleFontsUrl([key]);
      return `<link rel="preload" href="${url}" as="style" crossorigin>`;
    })
    .filter(Boolean);
}

/**
 * Generate link element for Google Fonts
 */
export function getGoogleFontsLink(fontKeys: (keyof typeof fonts)[]): string {
  const url = getGoogleFontsUrl(fontKeys);
  if (!url) return "";

  return `<link rel="stylesheet" href="${url}">`;
}

/**
 * Check if fonts are loaded
 */
export async function areFontsLoaded(fontFamilies: string[]): Promise<boolean> {
  if (typeof document === "undefined") return false;

  try {
    await Promise.all(fontFamilies.map((family) => document.fonts.load(`16px "${family}"`)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for fonts to load with timeout
 */
export async function waitForFonts(fontFamilies: string[], timeout = 3000): Promise<boolean> {
  if (typeof document === "undefined") return false;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);

    areFontsLoaded(fontFamilies).then((loaded) => {
      clearTimeout(timer);
      resolve(loaded);
    });
  });
}

// ============================================
// CSS-in-JS Helpers
// ============================================

/**
 * Font smoothing CSS for crisp text rendering
 */
export const fontSmoothing = {
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeLegibility",
} as const;

/**
 * Font feature settings for Inter
 */
export const fontFeatureSettings = {
  /** Enable common ligatures and contextual alternates */
  normal: '"calt" 1, "liga" 1',
  /** Enable tabular figures for aligned numbers */
  tabular: '"tnum" 1, "calt" 1',
  /** Enable case-sensitive forms */
  case: '"case" 1',
  /** Enable stylistic set 01 (alternate digits) */
  ss01: '"ss01" 1',
  /** Enable stylistic set 02 (alternate a) */
  ss02: '"ss02" 1',
} as const;

// ============================================
// License Information
// ============================================

/**
 * Get license information for all used fonts
 */
export function getFontLicenses(): Array<{
  family: string;
  license: string;
  url?: string | undefined;
}> {
  return Object.values(fonts).map((font) => ({
    family: font.family,
    license: font.license,
    url: font.licenseUrl,
  }));
}

/**
 * Font license compliance notice
 */
export const fontLicenseNotice = `
Fonts used in this project are licensed under open-source licenses:

- Inter: SIL Open Font License 1.1
- Public Sans: SIL Open Font License 1.1
- JetBrains Mono: SIL Open Font License 1.1
- Noto Sans SC (Source Han Sans): SIL Open Font License 1.1

All fonts are free for commercial use. See individual license files for details.
`.trim();
