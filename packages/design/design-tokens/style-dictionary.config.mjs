/**
 * Style Dictionary v4 build configuration
 *
 * Three platforms (CSS / TS / Tailwind preset) consume the same DTCG tokens.
 * Output goes to ./build/* and to packages/design/tokens/styles.css and packages/design/theme/themes.css
 * via concat-and-replace once parity is at 99%+.
 *
 * Build modes:
 *   light   → :root (core + semantic + light theme)
 *   dark    → .dark (core + semantic + dark theme)
 *   <multi> → [data-theme="<name>"] (one of: neon, gradient, dark-dense, minimal, vibrant, ocean)
 *
 * Modeling extensions handled by post-processing:
 *   - $extensions["com.nebutra.display-p3"]  → emit @supports (color: color(display-p3 ...)) override
 *   - $extensions["com.nebutra.oklch"]       → emit @supports (color: oklch(0 0 0)) override
 *   - composite transition / focusRing       → emit shorthand --transition / --focus-ring
 *   - tailwind @theme inline                 → emit `@theme inline { ... }` block referencing tokens
 *
 * Reference: https://styledictionary.com/reference/config/
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import StyleDictionary from "style-dictionary";

const MULTI_THEMES = ["neon", "gradient", "dark-dense", "minimal", "vibrant", "ocean"];

/**
 * Custom CSS variable namer.
 *
 * Maps DTCG paths to the same names the legacy SSOT uses.
 */
function pathToCssVarName(token) {
  const path = token.path;
  const [head, ...rest] = path;

  // Drop primitive `color.` prefix → keep child name.
  if (head === "color") {
    if (rest[0] === "white" || rest[0] === "black") return null;
    if (rest[0] === "tertiary-purple") return "brand-tertiary";
    return rest.join("-");
  }

  if (head === "size") return rest.join("-");
  if (head === "duration") return `duration-${rest.join("-")}`;
  if (head === "easing") return `ease-${rest.join("-")}`;
  if (head === "fontFamily") return `font-${rest.join("-")}`;

  if (head === "brand") {
    if (rest[0] === "gradient") {
      const sub = rest.slice(1).join("-");
      return sub === "primary" ? "brand-gradient" : `brand-gradient-${sub}`;
    }
    return `brand-${rest.join("-")}`;
  }

  if (head === "status") return `status-${rest.join("-")}`;

  if (head === "container") return `container-${rest.join("-")}`;
  if (head === "radius") {
    return rest[0] === "default" ? "radius" : `radius-${rest.join("-")}`;
  }
  if (head === "transition") {
    if (rest[0] === "shorthand") return "transition";
    if (rest[0] === "default") return null; // composite — emitted via post-process
    return `transition-${rest.join("-")}`;
  }
  if (head === "focusRing") {
    if (rest[0] === "default") return "focus-ring";
    return `focus-ring-${rest.join("-")}`;
  }

  if (head === "scale") return rest.join("-");
  if (head === "shadcn") return rest.join("-");
  if (head === "ds") return `ds-${rest.join("-")}`;
  if (head === "elevation") return `elevation-${rest.join("-")}`;

  if (head === "theme") return null;

  if (head === "shadow") return `shadow-${rest.join("-")}`;

  return path.join("-");
}

StyleDictionary.registerTransform({
  name: "name/nebutra/css",
  type: "name",
  transform: (token) => pathToCssVarName(token) ?? `__skip__${token.path.join("-")}`,
});

/**
 * Multi-theme CSS variable namer.
 *
 * Multi-theme files (neon, gradient, dark-dense, minimal, vibrant, ocean) emit
 * Tailwind v4 \`@theme\`-compatible names: color.primary → --color-primary,
 * radius.md → --radius-md, fontFamily.sans → --font-sans, shadow.sm → --shadow-sm,
 * transition.fast → --transition-fast.
 */
function multiThemeName(token) {
  const path = token.path;
  const [head, ...rest] = path;
  if (head === "theme") return null;
  if (head === "color") return `color-${rest.join("-")}`;
  if (head === "radius") return `radius-${rest.join("-")}`;
  if (head === "fontFamily") return `font-${rest.join("-")}`;
  if (head === "shadow") return `shadow-${rest.join("-")}`;
  if (head === "transition") return `transition-${rest.join("-")}`;
  return path.join("-");
}

StyleDictionary.registerTransform({
  name: "name/nebutra/css/multi-theme",
  type: "name",
  transform: (token) => multiThemeName(token) ?? `__skip__${token.path.join("-")}`,
});

const filterSkipped = (token) => !token.name?.startsWith("__skip__");

StyleDictionary.registerTransform({
  name: "color/nebutra/passthrough",
  type: "value",
  filter: (token) => token.$type === "color" || token.type === "color",
  transform: (token) => {
    const value = token.$value ?? token.value;
    return typeof value === "string" ? value : value;
  },
});

StyleDictionary.registerTransform({
  name: "string/nebutra/passthrough",
  type: "value",
  filter: (token) => token.$type === "string" || token.type === "string",
  transform: (token) => token.$value ?? token.value,
});

const buildMode = ({
  mode,
  selector,
  sources,
  outputFile,
  nameTransform = "name/nebutra/css",
}) => ({
  log: { verbosity: "default", warnings: "warn" },
  preprocessors: ["tokens-studio"],
  source: sources,
  platforms: {
    css: {
      transforms: [
        "attribute/cti",
        "color/nebutra/passthrough",
        "string/nebutra/passthrough",
        nameTransform,
      ],
      buildPath: "build/css/",
      options: { usesDtcg: true },
      files: [
        {
          destination: outputFile,
          format: "css/variables",
          filter: filterSkipped,
          options: {
            selector,
            outputReferences: false,
            fileHeader: () => [
              "@nebutra/design-tokens — generated from W3C DTCG tokens.",
              "DO NOT EDIT — edit tokens/*.json and re-run `pnpm build`.",
            ],
          },
        },
      ],
    },
    ts: {
      transforms: [
        "attribute/cti",
        "color/nebutra/passthrough",
        "string/nebutra/passthrough",
        "name/pascal",
      ],
      buildPath: "build/ts/",
      options: { usesDtcg: true },
      files: [
        { destination: `${mode}.ts`, format: "javascript/es6" },
        { destination: `${mode}.d.ts`, format: "typescript/es6-declarations" },
      ],
    },
    tailwind: {
      transforms: [
        "attribute/cti",
        "color/nebutra/passthrough",
        "string/nebutra/passthrough",
        nameTransform,
      ],
      buildPath: "build/tailwind/",
      options: { usesDtcg: true },
      files: [
        {
          destination: `${mode}.preset.cjs`,
          format: "javascript/module-flat",
          filter: filterSkipped,
        },
      ],
    },
  },
});

const configs = [
  buildMode({
    mode: "light",
    selector: ":root",
    sources: ["tokens/core.json", "tokens/semantic.json", "tokens/themes/light.json"],
    outputFile: "light.css",
  }),
  buildMode({
    mode: "dark",
    selector: ".dark",
    sources: ["tokens/core.json", "tokens/semantic.json", "tokens/themes/dark.json"],
    outputFile: "dark.css",
  }),
  // Multi-theme builds: include ONLY the theme file (not core/semantic primitives).
  // The brand primitives are emitted once via the light/dark builds and shared
  // across all themes via cascade. Multi-theme files only override theme-scoped
  // tokens (--color-*, --radius-*, --font-*, etc.).
  // Multi-theme builds: include ONLY the theme file (not core/semantic primitives).
  // Use the multi-theme namer so color.primary → --color-primary (Tailwind v4 @theme).
  ...MULTI_THEMES.map((name) =>
    buildMode({
      mode: name,
      selector: name === "neon" ? "@theme" : `[data-theme="${name}"]`,
      sources: [`tokens/themes/${name}.json`],
      outputFile: `${name}.css`,
      nameTransform: "name/nebutra/css/multi-theme",
    }),
  ),
];

for (const cfg of configs) {
  const sd = new StyleDictionary(cfg);
  await sd.hasInitialized;
  await sd.cleanAllPlatforms();
  await sd.buildAllPlatforms();
}

// ─── Post-processing ─────────────────────────────────────────────────────────
//
// SD's css/variables format does not natively model:
//   - @supports (color: color(display-p3 ...)) wrappers
//   - @supports (color: oklch(0 0 0)) wrappers
//   - Token aliases that compute from primitive values (--nebutra-brand-blue)
//   - Composite shorthand tokens (--transition shorthand)
//   - Tailwind v4 `@theme inline { ... }` blocks
//
// We post-process the generated CSS to inject these constructs.

/** Parse a JSON file and return its content. */
async function readJson(filePath) {
  const txt = await readFile(filePath, "utf8");
  return JSON.parse(txt);
}

/**
 * Walk a DTCG token tree; for each leaf with $value, emit
 * { path: ["color","nebutra-blue","500"], leaf: { $value: ..., $extensions: ... } }
 */
function* walkTokens(node, path = []) {
  if (node === null || typeof node !== "object") return;
  if ("$value" in node) {
    yield { path, leaf: node };
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    yield* walkTokens(child, [...path, key]);
  }
}

/** Build `varName → P3 value` map from core.json. */
async function buildP3Map() {
  const core = await readJson("tokens/core.json");
  const map = new Map();
  for (const { path, leaf } of walkTokens(core)) {
    const p3 = leaf?.$extensions?.["com.nebutra.display-p3"];
    if (!p3) continue;
    const name = pathToCssVarName({ path });
    if (name && !name.startsWith("__skip__")) map.set(name, p3);
  }
  return map;
}

/** Build `varName → oklch value` map for a given theme file. */
async function buildOklchMap(themePath) {
  const theme = await readJson(themePath);
  const map = new Map();
  for (const { path, leaf } of walkTokens(theme)) {
    const ok = leaf?.$extensions?.["com.nebutra.oklch"];
    if (!ok) continue;
    const name = pathToCssVarName({ path });
    if (name && !name.startsWith("__skip__")) map.set(name, ok);
  }
  return map;
}

/**
 * Inject the post-processing extras (P3 brand bridge, oklch ds-gray, gradient aliases,
 * --transition / --focus-ring, --nebutra-brand-blue / --nebutra-brand-cyan) into the
 * generated mode CSS for the given selector.
 */
function buildExtras({ selector, p3Map, oklchMap, includeBrandBridge, isDark }) {
  const lines = [];

  // 1. --nebutra-brand-blue / --nebutra-brand-cyan aliases (only in :root for parity).
  if (includeBrandBridge) {
    lines.push(
      `${selector} {`,
      `  /* Wide-gamut bridge: default to sRGB, upgrade to Display-P3 when available. */`,
      `  --nebutra-brand-blue: var(--nebutra-blue-500);`,
      `  --nebutra-brand-cyan: var(--nebutra-cyan-500);`,
      `}`,
      ``,
    );
  }

  // 2. --gradient-brand-* aliases (Tailwind @theme convention used by docs apps).
  //    These mirror --brand-gradient-* so existing consumers keep working.
  lines.push(
    `${selector} {`,
    `  /* Gradient aliases — both --brand-gradient-* (canonical, CLAUDE.md) and --gradient-brand-* (legacy) are emitted. */`,
    `  --gradient-brand: var(--brand-gradient);`,
    `  --gradient-brand-hover: var(--brand-gradient-reverse);`,
    `  --gradient-brand-vertical: var(--brand-gradient-vertical);`,
    `  --gradient-brand-reverse: var(--brand-gradient-reverse);`,
    `  --gradient-brand-radial: var(--brand-gradient-radial);`,
    `  --gradient-brand-glow: var(--brand-gradient-radial);`,
    `  --gradient-section: var(--brand-gradient-vertical);`,
    `  --gradient-glow: var(--brand-gradient-radial);`,
    `}`,
    ``,
  );

  // 3. --transition shorthand + --focus-ring composite.
  if (selector === ":root") {
    lines.push(
      `${selector} {`,
      `  /* Composite tokens — combine duration + easing for shorthand use. */`,
      `  --transition: 150ms ease-out;`,
      `  --focus-ring: 0 0 0 2px hsl(var(--ring) / 0.4);`,
      `}`,
      ``,
    );
  }

  // 4. P3 wide-gamut overrides (only emit once, in the lightest selector).
  if (includeBrandBridge && p3Map && p3Map.size > 0) {
    lines.push(
      `@supports (color: color(display-p3 1 1 1)) {`,
      `  ${selector} {`,
      `    /* Richer brand values on Display-P3 hardware; sRGB fallback above. */`,
    );
    for (const [name, value] of p3Map) {
      lines.push(`    --${name}: ${value};`);
    }
    // Bridge tokens get P3 values too.
    if (p3Map.has("nebutra-blue-500")) {
      lines.push(`    --nebutra-brand-blue: ${p3Map.get("nebutra-blue-500")};`);
    }
    if (p3Map.has("nebutra-cyan-500")) {
      lines.push(`    --nebutra-brand-cyan: ${p3Map.get("nebutra-cyan-500")};`);
    }
    lines.push(`  }`, `}`, ``);
  }

  // 5. oklch overrides for --ds-gray-*.
  if (oklchMap && oklchMap.size > 0) {
    lines.push(
      `@supports (color: oklch(0 0 0)) {`,
      `  ${selector} {`,
      `    /* oklch values for modern engines (2024+); sRGB hsla() fallback above. */`,
    );
    for (const [name, value] of oklchMap) {
      lines.push(`    --${name}: ${value};`);
    }
    lines.push(`  }`, `}`, ``);
  }

  return lines.join("\n");
}

/**
 * Build the Tailwind v4 `@theme inline { ... }` block.
 * Maps semantic CSS variables to Tailwind utility colors (bg-primary, text-foreground, etc.).
 */
function buildTailwindThemeInline() {
  return `/* ============================================
   Tailwind CSS 4 Theme Configuration (auto-generated)
   ============================================ */
@theme inline {
  /* Nebutra Brand Color Palette */
  --color-nebutra-blue-50: var(--nebutra-blue-50);
  --color-nebutra-blue-100: var(--nebutra-blue-100);
  --color-nebutra-blue-200: var(--nebutra-blue-200);
  --color-nebutra-blue-300: var(--nebutra-blue-300);
  --color-nebutra-blue-400: var(--nebutra-blue-400);
  --color-nebutra-blue-500: var(--nebutra-blue-500);
  --color-nebutra-blue-600: var(--nebutra-blue-600);
  --color-nebutra-blue-700: var(--nebutra-blue-700);
  --color-nebutra-blue-800: var(--nebutra-blue-800);
  --color-nebutra-blue-900: var(--nebutra-blue-900);
  --color-nebutra-blue-950: var(--nebutra-blue-950);

  --color-nebutra-cyan-50: var(--nebutra-cyan-50);
  --color-nebutra-cyan-100: var(--nebutra-cyan-100);
  --color-nebutra-cyan-200: var(--nebutra-cyan-200);
  --color-nebutra-cyan-300: var(--nebutra-cyan-300);
  --color-nebutra-cyan-400: var(--nebutra-cyan-400);
  --color-nebutra-cyan-500: var(--nebutra-cyan-500);
  --color-nebutra-cyan-600: var(--nebutra-cyan-600);
  --color-nebutra-cyan-700: var(--nebutra-cyan-700);
  --color-nebutra-cyan-800: var(--nebutra-cyan-800);
  --color-nebutra-cyan-900: var(--nebutra-cyan-900);
  --color-nebutra-cyan-950: var(--nebutra-cyan-950);

  --color-nebutra-neutral-50: var(--nebutra-neutral-50);
  --color-nebutra-neutral-100: var(--nebutra-neutral-100);
  --color-nebutra-neutral-200: var(--nebutra-neutral-200);
  --color-nebutra-neutral-300: var(--nebutra-neutral-300);
  --color-nebutra-neutral-400: var(--nebutra-neutral-400);
  --color-nebutra-neutral-500: var(--nebutra-neutral-500);
  --color-nebutra-neutral-600: var(--nebutra-neutral-600);
  --color-nebutra-neutral-700: var(--nebutra-neutral-700);
  --color-nebutra-neutral-800: var(--nebutra-neutral-800);
  --color-nebutra-neutral-900: var(--nebutra-neutral-900);
  --color-nebutra-neutral-950: var(--nebutra-neutral-950);

  /* Semantic Theme Colors */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
  --color-info: hsl(var(--info));
  --color-info-foreground: hsl(var(--info-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  /* Sidebar */
  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));

  /* Brand aliases */
  --color-brand-primary: var(--brand-primary);
  --color-brand-accent: var(--brand-accent);
  --color-brand-tertiary: var(--brand-tertiary);

  /* Chart colors */
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));

  /* 12-Step Functional Scales */
  --color-neutral-1: var(--neutral-1);
  --color-neutral-2: var(--neutral-2);
  --color-neutral-3: var(--neutral-3);
  --color-neutral-4: var(--neutral-4);
  --color-neutral-5: var(--neutral-5);
  --color-neutral-6: var(--neutral-6);
  --color-neutral-7: var(--neutral-7);
  --color-neutral-8: var(--neutral-8);
  --color-neutral-9: var(--neutral-9);
  --color-neutral-10: var(--neutral-10);
  --color-neutral-11: var(--neutral-11);
  --color-neutral-12: var(--neutral-12);

  --color-blue-1: var(--blue-1);
  --color-blue-2: var(--blue-2);
  --color-blue-3: var(--blue-3);
  --color-blue-4: var(--blue-4);
  --color-blue-5: var(--blue-5);
  --color-blue-6: var(--blue-6);
  --color-blue-7: var(--blue-7);
  --color-blue-8: var(--blue-8);
  --color-blue-9: var(--blue-9);
  --color-blue-10: var(--blue-10);
  --color-blue-11: var(--blue-11);
  --color-blue-12: var(--blue-12);

  --color-cyan-1: var(--cyan-1);
  --color-cyan-2: var(--cyan-2);
  --color-cyan-3: var(--cyan-3);
  --color-cyan-4: var(--cyan-4);
  --color-cyan-5: var(--cyan-5);
  --color-cyan-6: var(--cyan-6);
  --color-cyan-7: var(--cyan-7);
  --color-cyan-8: var(--cyan-8);
  --color-cyan-9: var(--cyan-9);
  --color-cyan-10: var(--cyan-10);
  --color-cyan-11: var(--cyan-11);
  --color-cyan-12: var(--cyan-12);

  /* Geist DS color scale */
  --color-blue-700: var(--ds-blue-700);
  --color-blue-900: var(--ds-blue-900);
  --color-red-200: var(--ds-red-200);
  --color-red-700: var(--ds-red-700);
  --color-red-900: var(--ds-red-900);
  --color-amber-200: var(--ds-amber-200);
  --color-amber-700: var(--ds-amber-700);
  --color-amber-900: var(--ds-amber-900);
  --color-green-200: var(--ds-green-200);
  --color-green-700: var(--ds-green-700);
  --color-green-900: var(--ds-green-900);
  --color-teal-300: var(--ds-teal-300);
  --color-teal-700: var(--ds-teal-700);
  --color-teal-900: var(--ds-teal-900);
  --color-purple-200: var(--ds-purple-200);
  --color-purple-700: var(--ds-purple-700);
  --color-purple-900: var(--ds-purple-900);
  --color-pink-300: var(--ds-pink-300);
  --color-pink-700: var(--ds-pink-700);
  --color-pink-900: var(--ds-pink-900);
  --color-gray-100: var(--ds-gray-100);
  --color-gray-200: var(--ds-gray-200);
  --color-gray-700: var(--ds-gray-700);
  --color-gray-1000: var(--ds-gray-1000);
  --color-trial-start: var(--ds-trial-start);
  --color-trial-end: var(--ds-trial-end);
  --color-turbo-start: var(--ds-turbo-start);
  --color-turbo-end: var(--ds-turbo-end);
  --color-geist-gray-100: var(--ds-gray-100);
  --color-geist-gray-200: var(--ds-gray-200);
  --color-geist-gray-500: var(--ds-gray-500);
  --color-geist-gray-600: var(--ds-gray-600);
  --color-geist-gray-700: var(--ds-gray-700);
  --color-geist-gray-1000: var(--ds-gray-1000);
  --color-geist-background-100: var(--ds-background-100);

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: var(--elevation-xs);
  --shadow-sm: var(--elevation-sm);
  --shadow-md: var(--elevation-md);
  --shadow-lg: var(--elevation-lg);
  --shadow-xl: var(--elevation-xl);
  --shadow-2xl: var(--elevation-2xl);
  --shadow-brand: var(--elevation-brand);
  --shadow-brand-lg: var(--elevation-brand-lg);

  /* Motion — Easing curves */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* Motion — Durations (four-rail; see core.json:duration). Names denote intent, not relative speed. */
  --duration-micro: 100ms;
  --duration-flow: 200ms;
  --duration-reveal: 300ms;
  --duration-cinematic: 500ms;

  /* Font family — Geist primary stack with CJK fallbacks */
  --font-sans: "Geist", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-cn: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "vivo Sans", sans-serif;
  --font-display: "Geist", "Noto Sans SC", sans-serif;
  --font-heading: "Geist", "Noto Sans SC", sans-serif;
  --font-mono: "Geist Mono", "Fira Code", ui-monospace, Consolas, "Courier New", monospace;
}
`;
}

const p3Map = await buildP3Map();
const lightOklchMap = await buildOklchMap("tokens/themes/light.json");
const darkOklchMap = await buildOklchMap("tokens/themes/dark.json");

const lightExtras = buildExtras({
  selector: ":root",
  p3Map,
  oklchMap: lightOklchMap,
  includeBrandBridge: true,
  isDark: false,
});
const darkExtras = buildExtras({
  selector: ".dark",
  p3Map: null, // P3 only emitted under :root (cascades into .dark)
  oklchMap: darkOklchMap,
  includeBrandBridge: false,
  isDark: true,
});

const lightCss = await readFile("build/css/light.css", "utf8");
const darkCss = await readFile("build/css/dark.css", "utf8");

// Append extras to each mode file.
const lightFinal = `${lightCss}\n${lightExtras}`;
const darkFinal = `${darkCss}\n${darkExtras}`;

await writeFile("build/css/light.css", lightFinal, "utf8");
await writeFile("build/css/dark.css", darkFinal, "utf8");

const tailwindBlock = buildTailwindThemeInline();
await writeFile("build/css/theme-inline.css", tailwindBlock, "utf8");

// Read the static base CSS (utilities, keyframes, body styles, CJK rules).
const baseCss = await readFile("static/base.css", "utf8");

const generatedHeader = `/* biome-ignore-all lint/suspicious/noDuplicateCustomProperties: auto-generated from W3C DTCG tokens — primitive + semantic blocks intentionally redeclare aliases. Fix in tokens/*.json source if real, then re-run pnpm --filter @nebutra/design-tokens build. */

/**
 * @nebutra/design-tokens — styles.generated.css
 * AUTO-GENERATED from packages/design/design-tokens/tokens/*.json — DO NOT EDIT.
 * Run \`pnpm --filter @nebutra/design-tokens build\` after editing tokens.
 *
 * SSOT Architecture:
 *   tokens/core.json        primitive scales (colors, sizes, durations, fonts)
 *   tokens/semantic.json    semantic aliases (brand.primary, status.danger, gradients)
 *   tokens/themes/light.json 12-step scales + shadcn HSL + Geist DS + elevation
 *   tokens/themes/dark.json  same shape, dark-mode values
 *
 * Modeling extensions:
 *   - Display-P3 wide-gamut overrides (\`@supports (color: color(display-p3 ...))\`)
 *   - oklch fallbacks for ds-gray-* (\`@supports (color: oklch(0 0 0))\`)
 *   - Composite shorthand tokens (\`--transition\`, \`--focus-ring\`)
 *   - Tailwind v4 \`@theme inline\` block
 *   - Dark-mode brand alias overrides (\`--brand-primary\` → \`--blue-9\` in .dark)
 */

`;

// styles.generated.css — used by `pnpm verify:parity` and as the replacement for
// packages/design/tokens/styles.css. Contains :root + .dark + extras + @theme inline + base.
const stylesCombined = `${generatedHeader}${lightFinal}\n${darkFinal}\n${tailwindBlock}\n${baseCss}`;
await writeFile("build/css/styles.generated.css", stylesCombined, "utf8");

// themes.generated.css — replacement for packages/design/theme/themes.css.
// Concatenates all multi-theme files with their data-theme selectors.
const themeFiles = await Promise.all(
  MULTI_THEMES.map(async (name) => {
    const css = await readFile(`build/css/${name}.css`, "utf8");
    return `/* ─── ${name} theme ─── */\n${css}`;
  }),
);
const themesHeader = `/**
 * @nebutra/theme — themes.generated.css
 * AUTO-GENERATED from packages/design/design-tokens/tokens/themes/*.json — DO NOT EDIT.
 *
 * Multi-theme engine — CSS-only:
 *   :root                         neon (default theme)
 *   [data-theme="gradient"]       Marketing/Growth
 *   [data-theme="dark-dense"]     DevOps Dashboard
 *   [data-theme="minimal"]        Blog/Portfolio
 *   [data-theme="vibrant"]        Creative UI/UX
 *   [data-theme="ocean"]          Community
 *
 * Integration:
 *   1. Import this file in each app's globals.css AFTER @import "tailwindcss"
 *   2. Configure next-themes with attribute="data-theme" defaultTheme="neon"
 */

`;
const themesBaseCss = await readFile("static/themes-base.css", "utf8");
const themesCombined = `${themesHeader}${themeFiles.join("\n\n")}\n\n${themesBaseCss}`;
await writeFile("build/css/themes.generated.css", themesCombined, "utf8");

process.stdout.write(
  "\n[design-tokens] build complete\n" +
    "  → build/css/styles.generated.css   (replaces packages/design/tokens/styles.css)\n" +
    "  → build/css/themes.generated.css   (replaces packages/design/theme/themes.css)\n",
);
