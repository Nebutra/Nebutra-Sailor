/**
 * Style Dictionary v4 build configuration
 *
 * Three platforms (CSS / TS / Tailwind preset) consume the same DTCG tokens.
 * Output goes to ./build/* for verify:parity against runtime @nebutra/tokens/styles.css
 * and keyframes sync to @nebutra/theme/keyframes.css.
 *
 * Build modes:
 *   light   → :root (core + semantic + light theme)
 *   dark    → .dark (core + semantic + dark theme)
 * Multi-mood [data-theme] catalogs removed — design languages live on @nebutra/theme.
 *
 * Modeling extensions handled by post-processing:
 *   - $extensions["com.nebutra.display-p3"]  → emit @supports (color: color(display-p3 ...)) override
 *   - $extensions["com.nebutra.oklch"]       → emit @supports (color: oklch(0 0 0)) override
 *   - composite transition / focusRing       → emit shorthand --transition / --focus-ring
 *   - tailwind @theme inline                 → emit `@theme inline { ... }` block referencing tokens
 *
 * Reference: https://styledictionary.com/reference/config/
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";
import { multiThemeName, pathToCssVarName } from "./scripts/css-var-name.mjs";
import { assertLadder, deriveBorderTier } from "./scripts/derive-border-tier.mjs";

// Multi-mood oklch catalog removed (2026.07). Only light/dark modes remain.
// Design-language swap lives in @nebutra/theme (Brand Packages / skins.css).
const MULTI_THEMES = [];
const repoRootUrl = new URL("../../..", import.meta.url);
const repoRoot = fileURLToPath(repoRootUrl);
const biomeBin = fileURLToPath(
  new URL(`node_modules/.bin/${process.platform === "win32" ? "biome.cmd" : "biome"}`, repoRootUrl),
);

function formatCssWithBiome(content, stdinFilePath) {
  if (!existsSync(biomeBin)) return content;
  try {
    return execFileSync(biomeBin, ["format", "--stdin-file-path", stdinFilePath], {
      cwd: repoRoot,
      input: content,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch {
    // Vercel CLI uploads can omit root ignore files Biome expects; never fail the token build on format.
    return content;
  }
}

// Mirror of FONT_REGISTRY in packages/design/fonts/src/index.ts (duplicated
// because this generator is plain ESM and cannot import the TS source).
const FONT_REGISTRY = {
  geist: "--font-geist-sans",
  "geist sans": "--font-geist-sans",
  "geist mono": "--font-geist-mono",
  "vivo sans sc": "--font-noto-sans-sc",
  inter: "--font-inter",
  "space grotesk": "--font-space-grotesk",
  "playfair display": "--font-playfair-display",
  "jetbrains mono": "--font-jetbrains-mono",
  manrope: "--font-reg-manrope",
  sora: "--font-reg-sora",
  "work sans": "--font-reg-work-sans",
  "dm sans": "--font-reg-dm-sans",
  "plus jakarta sans": "--font-reg-plus-jakarta-sans",
  outfit: "--font-reg-outfit",
  figtree: "--font-reg-figtree",
  montserrat: "--font-reg-montserrat",
  lexend: "--font-reg-lexend",
  "fira code": "--font-reg-fira-code",
  "roboto mono": "--font-reg-roboto-mono",
  "source code pro": "--font-reg-source-code-pro",
};

function normalizeFontFamily(name) {
  return name.replace(/['"]/g, "").trim().toLowerCase();
}

function primaryFontFamily(stack) {
  return normalizeFontFamily(String(stack).split(",")[0] ?? "");
}

function withRegistryFont(stack) {
  if (typeof stack !== "string" || stack.includes("var(--font-")) return stack;
  const variable = FONT_REGISTRY[primaryFontFamily(stack)];
  return variable ? `var(${variable}), ${stack}` : stack;
}

StyleDictionary.registerTransform({
  name: "name/nebutra/css",
  type: "name",
  transform: (token) => pathToCssVarName(token) ?? `__skip__${token.path.join("-")}`,
});

StyleDictionary.registerTransform({
  name: "name/nebutra/css/multi-theme",
  type: "name",
  transform: (token) => multiThemeName(token) ?? `__skip__${token.path.join("-")}`,
});

const filterSkipped = (token) => !token.name?.startsWith("__skip__");

function* walkTokenLeaves(node, path = []) {
  if (node === null || typeof node !== "object") return;
  if ("$value" in node) {
    yield { path, leaf: node };
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    yield* walkTokenLeaves(child, [...path, key]);
  }
}

function nameForTransform(path, nameTransform) {
  const token = { path };
  return nameTransform === "name/nebutra/css/multi-theme"
    ? multiThemeName(token)
    : pathToCssVarName(token);
}

function toPascalName(path) {
  return path
    .flatMap((part) => String(part).split(/[-_\s]+/u))
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function tokenSourceKey(token, sources) {
  const filePath = String(token.filePath ?? "").replace(/\\/gu, "/");
  return sources.find((source) => filePath.endsWith(source));
}

function skipName(token, sourceKey) {
  const source = String(sourceKey ?? "unknown").replace(/[^a-z0-9]+/giu, "-");
  return `__skip__${source}-${token.path.join("-")}`;
}

function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/iu.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function srgbToLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function formatNumber(value, precision) {
  return Number(value.toFixed(precision)).toString();
}

function hexToOklch(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map(srgbToLinear);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bAxis = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const chroma = Math.sqrt(a * a + bAxis * bAxis);
  const hue = chroma < 0.00001 ? 0 : (Math.atan2(bAxis, a) * 180) / Math.PI;
  const normalizedHue = hue < 0 ? hue + 360 : hue;

  return `oklch(${formatNumber(lightness, 3)} ${formatNumber(chroma, 3)} ${formatNumber(normalizedHue, 1)})`;
}

function _replaceHexWithOklch(css) {
  return css.replace(/#[0-9a-f]{6}\b/giu, (hex) => hexToOklch(hex));
}

function registerLayeredNameTransform({ name, sources, nameForPath }) {
  const canonicalKeyByName = new Map();
  const canonicalPathByName = new Map();

  for (const source of sources) {
    const tokens = JSON.parse(readFileSync(source, "utf8"));
    for (const { path } of walkTokenLeaves(tokens)) {
      const tokenName = nameForPath(path);
      if (!tokenName) continue;
      const pathKey = path.join(".");
      canonicalKeyByName.set(tokenName, `${source}::${pathKey}`);
      canonicalPathByName.set(tokenName, pathKey);
    }
  }

  StyleDictionary.registerTransform({
    name,
    type: "name",
    transform: (token) => {
      const tokenName = nameForPath(token.path);
      const sourceKey = tokenSourceKey(token, sources);
      if (!tokenName) return skipName(token, sourceKey);

      const pathKey = token.path.join(".");
      const tokenKey = sourceKey ? `${sourceKey}::${pathKey}` : undefined;
      const isCanonical = tokenKey
        ? canonicalKeyByName.get(tokenName) === tokenKey
        : canonicalPathByName.get(tokenName) === pathKey;

      return isCanonical ? tokenName : skipName(token, sourceKey);
    },
  });

  return name;
}

/**
 * Border-tier derivation.
 *
 * core.json ships 11 primitive stops; the functional layer needs 12 steps. The
 * gap used to be closed by aliasing 6/7/8 to the same primitives as 3/4/5,
 * which made the border tier identical to the component-background tier. Steps
 * 6/7/8 are now computed from the scale's own 5 and 9 (or 10, for bright
 * scales) in OKLab. See scripts/derive-border-tier.mjs for the rule.
 *
 * This runs as a global preprocessor, so it sees the merged core + semantic +
 * theme tree and can resolve the `{color.…}` references the anchors point at.
 * Deriving here rather than authoring literals in core.json is what makes the
 * fix survive `scripts/brand-apply.ts`, which rewrites the three brand palettes
 * wholesale over a fixed 11-stop list on every rebrand.
 */
StyleDictionary.registerPreprocessor({
  name: "nebutra/derive-border-tier",
  preprocessor: (tokens) => {
    deriveBorderTier(tokens);
    return tokens;
  },
});

/**
 * A token description must not be able to break the build.
 *
 * $description is emitted verbatim into `/** … *\/` comments in the CSS and the
 * TypeScript declarations, so a description containing the comment terminator
 * closes it early and the generated .ts stops parsing. Writing an asterisk-slash inside a note
 * about a colour ramp is enough to do it, and the failure surfaces as a
 * sixty-line minified prettier stack trace pointing at a blank line in
 * build/ts/estree.ts — nowhere near the token that caused it.
 *
 * Neutralised rather than rejected: the author's sentence still reads the same,
 * and there is nothing for a contributor to learn or remember.
 */
StyleDictionary.registerPreprocessor({
  name: "nebutra/safe-descriptions",
  preprocessor: (tokens) => {
    const walk = (node) => {
      if (node === null || typeof node !== "object") return;
      if (typeof node.$description === "string" && node.$description.includes("*/")) {
        node.$description = node.$description.replaceAll("*/", "* /");
      }
      for (const [key, child] of Object.entries(node)) {
        if (key === "$description") continue;
        walk(child);
      }
    };
    walk(tokens);
    return tokens;
  },
});

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

StyleDictionary.registerTransform({
  name: "fontFamily/nebutra/registry",
  type: "value",
  filter: (token) => token.$type === "fontFamily" || token.type === "fontFamily",
  transform: (token) => withRegistryFont(token.$value ?? token.value),
});

const buildMode = ({ mode, selector, sources, outputFile, nameTransform = "name/nebutra/css" }) => {
  const cssNameTransform = registerLayeredNameTransform({
    name: `${nameTransform}/${mode}/layered`,
    sources,
    nameForPath: (path) => nameForTransform(path, nameTransform),
  });
  const tsNameTransform = registerLayeredNameTransform({
    name: `name/nebutra/pascal/${mode}/layered`,
    sources,
    nameForPath: toPascalName,
  });

  return {
    log: { verbosity: "default", warnings: "error" },
    preprocessors: ["tokens-studio", "nebutra/safe-descriptions", "nebutra/derive-border-tier"],
    include: sources.slice(0, -1),
    source: sources.slice(-1),
    platforms: {
      css: {
        transforms: [
          "attribute/cti",
          "color/nebutra/passthrough",
          "string/nebutra/passthrough",
          "fontFamily/nebutra/registry",
          cssNameTransform,
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
          "fontFamily/nebutra/registry",
          tsNameTransform,
        ],
        buildPath: "build/ts/",
        options: { usesDtcg: true },
        files: [
          { destination: `${mode}.js`, format: "javascript/es6", filter: filterSkipped },
          {
            destination: `${mode}.d.ts`,
            format: "typescript/es6-declarations",
            filter: filterSkipped,
          },
        ],
      },
      tailwind: {
        transforms: [
          "attribute/cti",
          "color/nebutra/passthrough",
          "string/nebutra/passthrough",
          "fontFamily/nebutra/registry",
          cssNameTransform,
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
  };
};

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
  // Product chrome SSOT is @nebutra/tokens (styles.css HSL + recipe). Every mood —
  // historical multi-mood path was scoped to [data-theme="…"]; catalog removed.
  // never ships a global @theme that overrides --color-primary / fonts at root.
  // Use the multi-theme namer so color.primary → --color-primary under that selector.
  ...MULTI_THEMES.map((name) =>
    buildMode({
      mode: name,
      selector: `[data-theme="${name}"]`,
      sources: [`tokens/themes/${name}.json`],
      outputFile: `${name}.css`,
      nameTransform: "name/nebutra/css/multi-theme",
    }),
  ),
];

const tsExportModes = ["light", "dark", ...MULTI_THEMES];

function toNamespaceIdentifier(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
}

// Clear shared output directories once. Every mode writes into the same platform
// folders, so cleaning inside the per-mode loop would remove earlier mode files.
await rm("build/css", { recursive: true, force: true });
await rm("build/ts", { recursive: true, force: true });
await rm("build/tailwind", { recursive: true, force: true });

for (const cfg of configs) {
  const sd = new StyleDictionary(cfg);
  await sd.hasInitialized;
  await sd.buildAllPlatforms();
}

// ─── Ladder invariant ────────────────────────────────────────────────────────
//
// Fail the build if the 12-step scales regress to the state this package was
// fixed out of: duplicated steps, or a ramp (1…8) that is not monotonic in
// OKLab lightness. Step 9 is exempt from monotonicity — on bright scales the
// solid accent legitimately sits off the ramp.
//
// This is the guard that makes the derivation load-bearing rather than
// decorative: if the preprocessor ever stops running, the placeholder `$value`
// aliases collapse 6/7/8 onto step 5 and this throws instead of shipping.
for (const mode of ["light", "dark"]) {
  const css = await readFile(`build/css/${mode}.css`, "utf8");
  const scales = new Map();
  for (const [, scaleName, step, value] of css.matchAll(
    /--(neutral|blue|cyan)-(\d{1,2}):\s*(#[0-9a-f]{6})\s*;/giu,
  )) {
    const key = scaleName.toLowerCase();
    if (!scales.has(key)) scales.set(key, {});
    scales.get(key)[step] = value;
  }

  const problems = [...scales].flatMap(([name, values]) => assertLadder(`${mode} ${name}`, values));
  if (problems.length > 0) {
    throw new Error(
      `[design-tokens] 12-step scale ladder invariant violated:\n  ${problems.join("\n  ")}`,
    );
  }
}

const tsIndex = `${tsExportModes
  .map((mode) => `export * as ${toNamespaceIdentifier(mode)} from "./${mode}.js";`)
  .join("\n")}
`;
const tsIndexDts = `${tsExportModes
  .map((mode) => `export * as ${toNamespaceIdentifier(mode)} from "./${mode}.js";`)
  .join("\n")}
`;

await writeFile("build/ts/index.js", tsIndex, "utf8");
await writeFile("build/ts/index.d.ts", tsIndexDts, "utf8");

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
function buildExtras({ selector, p3Map, oklchMap, includeBrandBridge }) {
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
    `  --gradient-brand-logo: var(--brand-gradient-logo);`,
    `  --gradient-brand-logo-reverse: var(--brand-gradient-logo-reverse);`,
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

  /* shadow-ambient-md / shadow-glass-lg / shadow-sheen — so marketing surfaces
     reach for a step on the ramp instead of spelling out a blur and a spread.
     Aliased to var() rather than inlined so the dark theme's values apply. */
  --shadow-ambient-sm: var(--elevation-ambient-sm);
  --shadow-ambient-md: var(--elevation-ambient-md);
  --shadow-ambient-lg: var(--elevation-ambient-lg);
  --shadow-glass-sm: var(--elevation-glass-sm);
  --shadow-glass-md: var(--elevation-glass-md);
  --shadow-glass-lg: var(--elevation-glass-lg);
  --shadow-sheen: var(--elevation-sheen);

  /* Coloured and centred elevation. shadow-ambient-glow is the one
     non-directional step; shadow-glow-accent|-lg|-sm carry a brand-accent halo
     so a glass card never hand-types the accent as raw rgba; shadow-glow-primary
     tints the xl geometry with the action fill. */
  --shadow-ambient-glow: var(--elevation-ambient-glow);
  --shadow-glow-accent: var(--elevation-glow-accent);
  --shadow-glow-accent-lg: var(--elevation-glow-accent-lg);
  --shadow-glow-accent-sm: var(--elevation-glow-accent-sm);
  --shadow-glow-primary: var(--elevation-glow-primary);

  /* Motion — Easing curves.
     Indirect, like the shadows above: an @theme entry holding a literal is
     inlined into the utility, so the ease-out class compiled to a fixed
     cubic-bezier and no Brand Package could move it. Pointing at the runtime
     rail in static/base.css makes it follow the language the page is under.
     (No backticks in this block — it is inside a JS template literal.) */
  --ease-in: var(--motion-ease-in);
  --ease-out: var(--motion-ease-out);
  --ease-brand: var(--motion-ease-brand);
  --ease-in-out: var(--motion-ease-in-out);
  --ease-spring: var(--motion-ease-spring);

  /* Motion — Durations (four-rail; see core.json:duration). Names denote intent, not relative speed. */
  --duration-micro: var(--motion-duration-micro);
  --duration-flow: var(--motion-duration-flow);
  --duration-reveal: var(--motion-duration-reveal);
  --duration-cinematic: var(--motion-duration-cinematic);

  /* The same four rails on the namespace Tailwind reads for duration-*.
     --duration-* is the variable other CSS consumes; the utility class is built
     from --transition-duration-*, and only that one. Without these,
     duration-micro and duration-reveal are class names that generate nothing:
     they were in use in the component library and on the marketing site, and
     every one of them silently fell back to the 150ms default. */
  --transition-duration-micro: var(--motion-duration-micro);
  --transition-duration-flow: var(--motion-duration-flow);
  --transition-duration-reveal: var(--motion-duration-reveal);
  --transition-duration-cinematic: var(--motion-duration-cinematic);

  /* Likewise for ease-*: the utility namespace is --ease-* already, so the four
     above are reachable as ease-brand / ease-spring without further mapping. */

  /* Spacing — DO NOT register --spacing-sm|md|lg|xl|2xl here.
     Tailwind v4 puts every --spacing-{key} on the shared size rail, so
     max-w-sm / max-w-2xl (and width/height/gap utilities with the same keys)
     resolve to the breathing-room lengths (0.75rem to 3rem) instead of the
     container scale (24rem to 42rem). That shipped as one-word-per-line prose
     and a 32px install box on nebutra.com (measured 2026-08-03).
     Brand Packages still override --space-source-*; consumers must read
     those vars directly (var(--space-source-md, ...)), never via a @theme
     --spacing-{step} alias. --spacing itself (0.25rem arithmetic base) stays
     untouched. See static/base.css. */

  /* Font family — Geist keeps Latin + numerals, self-hosted Noto Sans SC takes
     CJK, system CJK faces behind it. Order is the design decision; see the
     fontFamily $description in tokens/core.json. Mirror of those tokens — keep
     the two in sync (verify:parity compares them). */
  --font-sans: var(--font-geist-sans), "Geist", var(--font-noto-sans-sc, "Noto Sans SC"), "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-cn: var(--font-geist-sans), "Geist", var(--font-noto-sans-sc, "Noto Sans SC"), "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-display: var(--font-geist-sans), "Geist", var(--font-noto-sans-sc, "Noto Sans SC"), sans-serif;
  --font-heading: var(--font-geist-sans), "Geist", var(--font-noto-sans-sc, "Noto Sans SC"), sans-serif;
  --font-mono: var(--font-geist-mono), "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
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
await writeFile(
  "build/css/styles.generated.css",
  formatCssWithBiome(stylesCombined, "packages/design/tokens/styles.css"),
  "utf8",
);

// themes.generated.css is keyframes-only (synced to @nebutra/theme/keyframes.css).
const themesBaseCss = await readFile("static/themes-base.css", "utf8");
const themesHeader = `/**
 * @nebutra/theme — keyframes.css (via themes.generated.css)
 * AUTO-GENERATED — multi-mood oklch catalog removed.
 * Product chrome SSOT: @nebutra/tokens. Design languages: @nebutra/theme/skins.css.
 * This file: shared keyframes only.
 */

`;
const themesCombined = `${themesHeader}${themesBaseCss}`;
await writeFile(
  "build/css/themes.generated.css",
  formatCssWithBiome(themesCombined, "packages/design/theme/keyframes.css"),
  "utf8",
);

process.stdout.write(
  "\n[design-tokens] build complete\n" +
    "  → build/css/styles.generated.css   (parity target for packages/design/tokens/styles.css)\n" +
    "  → build/css/themes.generated.css   (keyframes → @nebutra/theme/keyframes.css)\n",
);
