/**
 * Build-time reads of the pinned KCQ chart source for the public pages. Nothing here is typed by
 * hand: tokens, preset palettes and the proof-strip facts all come from the checkout that
 * chart-source.json pins, so a number on /home is only ever what that commit contains.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const DEFAULT_PRESET = "pro";
export const PRESET_ORDER = ["pro", "exchange", "terminal", "zen", "quant"];
export const MODES = ["light", "dark"];

const TOKEN_DIR = "packages/core/design-tokens/css";

/** `--name: value;` pairs of the first block whose selector matches. */
export function readVars(css, selector = ":root") {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`No ${selector} block in token CSS`);
  const vars = new Map();
  for (const match of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    vars.set(match[1], match[2].trim());
  }
  return vars;
}

/**
 * Indicator, drawing-tool and legacy groups only the chart canvas reads (it resolves them from its
 * own theme objects); the page ships the interface, candle and foundation groups.
 */
const CANVAS_ONLY =
  /^--klc-(?:color-(?:ma|boll|macd|rsi|cci|kdj|mom|wmsr|kst|expma|ene|ichimoku|fib|gmma|pivot|structure|zones|volume-price|palette|heatmap|footprint|volume-profile|avwap|mtf|time-share|alert|agent|reference-line|tag-bg|label|last-price-label|selection|tooltip|performance|volume)-|spacing-|typography-|motion-duration-|motion-easing-)/;

function declarations(vars) {
  return [...vars]
    .filter(([name]) => !CANVAS_ONLY.test(name))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

function tokenFile(source, name) {
  const path = resolve(source, TOKEN_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`KCQ tokens missing: ${path}. Pin a chart commit with design tokens v2.`);
  }
  return readFileSync(path, "utf8");
}

/**
 * One stylesheet: the generated foundation, then the default preset per mode. `data-theme` is set
 * before first paint by the theme-init script; without JS the system preference still applies.
 */
export function buildTokensCss(source, preset = DEFAULT_PRESET) {
  const foundation = tokenFile(source, "foundation.css");
  const light = readVars(tokenFile(source, `theme.${preset}.light.css`));
  const dark = readVars(tokenFile(source, `theme.${preset}.dark.css`));
  const lightMode = readVars(foundation, "[data-theme='light']");
  const darkMode = readVars(foundation, "[data-theme='dark']");
  return [
    `/* Generated from ${TOKEN_DIR} (preset ${preset}) by apps/kcq/scripts/landing-source.mjs. */`,
    foundation.replace(/^\/\*.*\*\/\n/, ""),
    `:root,\n[data-theme='light'] {\n  color-scheme: light;\n${declarations(light)}\n}`,
    `[data-theme='dark'] {\n  color-scheme: dark;\n${declarations(dark)}\n}`,
    `:root:not([data-theme]) {\n${declarations(lightMode)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n    color-scheme: dark;\n${declarations(
      new Map([...dark, ...darkMode]),
    ).replace(/^/gm, "  ")}\n  }\n}`,
    "",
  ].join("\n");
}

const PREVIEW_KEYS = {
  background: "--klc-color-chart-background",
  surface: "--klc-color-ui-surface",
  grid: "--klc-color-grid-major",
  axis: "--klc-color-axis-text",
  text: "--klc-color-ui-text",
  muted: "--klc-color-ui-muted",
  border: "--klc-color-ui-border",
  up: "--klc-color-candle-up-body",
  down: "--klc-color-candle-down-body",
};

/** The colours a preset preview needs, per preset and mode, straight from the generated CSS. */
export function readPresetPalettes(source) {
  const foundation = tokenFile(source, "foundation.css");
  const accent = readVars(foundation).get("--klc-brand-accent");
  const palettes = {};
  for (const preset of PRESET_ORDER) {
    palettes[preset] = {};
    for (const mode of MODES) {
      const vars = readVars(tokenFile(source, `theme.${preset}.${mode}.css`));
      const palette = { accent };
      for (const [key, name] of Object.entries(PREVIEW_KEYS)) {
        const value = vars.get(name);
        if (!value) throw new Error(`theme.${preset}.${mode}.css lacks ${name}`);
        palette[key] = value;
      }
      palettes[preset][mode] = palette;
    }
  }
  return palettes;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) files.push(path);
  }
  return files;
}

/**
 * Proof-strip facts. Each carries the file it was counted from, so the page links the reader to
 * the exact line of evidence at the pinned commit.
 */
export function readFacts(source, pin) {
  const core = resolve(source, "packages/core");
  const tools = [];
  for (const file of walk(resolve(core, "src"))) {
    const text = readFileSync(file, "utf8");
    // The decorator's own object literal: name first, then (before the closing `})`) its safety.
    for (const match of text.matchAll(/@Tool\(\{\s*name:\s*'([a-z_]+)'([\s\S]*?)\n\s*\}\)/g)) {
      const safety = /safety:\s*'(read-only|destructive)'/.exec(match[2])?.[1];
      if (!safety) throw new Error(`@Tool ${match[1]} declares no safety level`);
      tools.push({ name: match[1], safety, file: relative(source, file) });
    }
  }
  if (tools.length === 0) throw new Error("No @Tool registrations found in the chart source");

  const hostFile = "packages/core/src/rendering/render/rendererHost.ts";
  const agentFile = "packages/core/src/features/agent/impl/chartAgentController.ts";
  const backendUnion = readFileSync(resolve(source, hostFile), "utf8").match(
    /export type RendererBackend = ([^\n]+)/,
  );
  const backends = backendUnion
    ? [...backendUnion[1].matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1])
    : [];
  if (backends.length === 0) throw new Error(`RendererBackend union not found in ${hostFile}`);

  const kinds = readFileSync(resolve(source, agentFile), "utf8").match(
    /const DRAWING_KIND_VALUES = \[([\s\S]*?)\] as const/,
  );
  const drawingKinds = kinds ? [...kinds[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]) : [];

  const bindings = [
    ["Vue", "packages/vue/package.json"],
    ["React", "packages/react/package.json"],
    ["Angular", "packages/angular/package.json"],
    ["Web Component", "packages/vue/src/web-component.ts"],
  ].filter(([, file]) => existsSync(resolve(source, file)));

  const presets = readdirSync(resolve(source, TOKEN_DIR)).filter((f) =>
    /^theme\.[a-z]+\.dark\.css$/.test(f),
  );
  const corePackage = JSON.parse(readFileSync(resolve(core, "package.json"), "utf8"));
  const rootPackage = JSON.parse(readFileSync(resolve(source, "package.json"), "utf8"));
  const blob = (file) => `${pin.repository.replace(/\.git$/, "")}/blob/${pin.commit}/${file}`;

  return {
    commit: pin.commit,
    repository: pin.repository.replace(/\.git$/, ""),
    upstream: pin.upstreamRepository.replace(/\.git$/, ""),
    version: corePackage.version,
    license: rootPackage.license ?? corePackage.license,
    tools: {
      count: tools.length,
      names: tools.map((t) => t.name),
      /** `@Tool` safety per tool: a read-only agent receives only the read-only ones. */
      safety: Object.fromEntries(tools.map((t) => [t.name, t.safety])),
      href: blob(agentFile),
    },
    backends: { names: backends, href: blob(hostFile) },
    drawingKinds: { count: drawingKinds.length, href: blob(agentFile) },
    bindings: { names: bindings.map(([name]) => name), href: blob("README.md") },
    presets: { count: presets.length, href: blob(TOKEN_DIR) },
    license_href: blob("LICENSE"),
  };
}
