#!/usr/bin/env tsx
/* eslint-disable */
/**
 * @nebutra/ui — shadcn-compatible Registry Builder
 *
 * Reads source files for TIER B components from packages/design/ui/src/primitives
 * (and components/) and emits shadcn registry v2 manifests to:
 *
 *   apps/design-docs/public/r/<name>.json    — single component manifest
 *   apps/design-docs/public/registry.json    — index of all components
 *
 * For each component the script:
 *   1. Reads the full source file content (verbatim).
 *   2. Parses `import` statements to derive:
 *        - dependencies        (npm packages)
 *        - registryDependencies (other components from the same registry)
 *        - peer/internal       (filtered out — already provided by tokens/utils)
 *   3. Scans the source for CSS variable references `var(--xxx)` and
 *      injects `cssVars.light/dark` fallback hex values from
 *      packages/design/design-tokens/build/ts/light.ts + dark.ts.
 *   4. Stamps `meta.nebutraTokens` (the variables actually used) and
 *      `meta.nebutraLayer` (marketing | dataviz | dashboard | animation | decoration | business).
 *
 * Run:
 *   pnpm --filter @nebutra/ui build:registry
 *
 * Inputs are listed in COMPONENT_REGISTRY (TIER B Phase 1 batch).
 * Outputs are deterministic JSON with two-space indent.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UI_ROOT = resolve(__dirname, "..");
// W3b layout: packages/design/ui/scripts/build-registry.ts → walk 3 levels up to repo root
const REPO_ROOT = resolve(UI_ROOT, "..", "..", "..");
const _PRIMITIVES_DIR = join(UI_ROOT, "src", "primitives");
const _COMPONENTS_DIR = join(UI_ROOT, "src", "components");
const TOKENS_LIGHT = join(
  REPO_ROOT,
  "packages",
  "design",
  "design-tokens",
  "build",
  "ts",
  "light.ts",
);
const TOKENS_DARK = join(
  REPO_ROOT,
  "packages",
  "design",
  "design-tokens",
  "build",
  "ts",
  "dark.ts",
);
const OUT_DIR = join(REPO_ROOT, "apps", "design-docs", "public", "r");
const OUT_INDEX = join(REPO_ROOT, "apps", "design-docs", "public", "registry.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RegistryLayer =
  | "marketing"
  | "dataviz"
  | "dashboard"
  | "animation"
  | "decoration"
  | "business";

interface ComponentSpec {
  /** kebab-case registry name */
  name: string;
  /** human-readable title */
  title: string;
  /** short description */
  description: string;
  /** source file (relative to packages/design/ui/src) */
  source: string;
  /** layer category */
  layer: RegistryLayer;
  /** registry:ui | registry:theme */
  type?: "registry:ui" | "registry:theme";
  /** path written into the consumer project */
  targetPath?: string;
}

interface ShadcnFile {
  path: string;
  type: string;
  content: string;
  target?: string;
}

interface ShadcnRegistryItem {
  $schema: string;
  name: string;
  type: string;
  title: string;
  description: string;
  author: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: ShadcnFile[];
  cssVars?: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  tailwind?: { config: { theme: { extend: Record<string, unknown> } } };
  meta: {
    nebutraTokens: string[];
    nebutraLayer: RegistryLayer;
  };
}

// ---------------------------------------------------------------------------
// TIER B Phase 1 (10 components) + Phase 2 chat tool-family (2 substrate +
// 6 tool primitives = 8) + 1 theme entry. Total: 18 + 1 theme.
// ---------------------------------------------------------------------------

const COMPONENT_REGISTRY: ComponentSpec[] = [
  {
    name: "bento-grid",
    title: "Bento Grid",
    description: "Responsive bento-style feature grid with hover-reveal CTAs.",
    source: "primitives/bento-grid.tsx",
    layer: "marketing",
  },
  {
    name: "pricing-card",
    title: "Pricing Card",
    description: "Composable pricing card with glass header, plan badges, price slots.",
    source: "primitives/pricing-card.tsx",
    layer: "marketing",
  },
  {
    name: "feature-card",
    title: "Feature Card",
    description:
      "Feature card with corner bracket decorators, header, body, and dual-mode imagery.",
    source: "primitives/feature-card.tsx",
    layer: "marketing",
  },
  {
    name: "animate-in",
    title: "AnimateIn",
    description:
      "Entrance animation primitive with emerge / flow / fade presets, lazy-loaded framer-motion.",
    source: "primitives/animate-in.tsx",
    layer: "animation",
  },
  {
    name: "magic-card",
    title: "Magic Card",
    description: "Spotlight cursor-tracking card with gradient border highlight.",
    source: "primitives/magic-card.tsx",
    layer: "animation",
  },
  {
    name: "globe",
    title: "Globe (WebGL)",
    description: "Interactive WebGL globe powered by cobe — heavy peer dependency.",
    source: "primitives/globe.tsx",
    layer: "dataviz",
  },
  {
    name: "chart",
    title: "Chart",
    description: "Recharts wrapper with theme-aware color tokens and tooltip primitives.",
    source: "primitives/chart.tsx",
    layer: "dataviz",
  },
  {
    name: "command-menu",
    title: "Command Menu",
    description: "AI command palette built on cmdk + base-ui dialog.",
    source: "primitives/command-menu.tsx",
    layer: "business",
  },
  {
    name: "kpi-card",
    title: "KPI Card",
    description: "Dashboard KPI card with trend chevrons and lucide iconography.",
    source: "primitives/kpi-card.tsx",
    layer: "dashboard",
  },
  {
    name: "metric-card",
    title: "Metric Card",
    description: "Linear / Vercel / Supabase inspired SaaS dashboard metric tile.",
    source: "primitives/metric-card.tsx",
    layer: "dashboard",
  },
  // -------------------------------------------------------------------------
  // Chat tool-family substrate (TextShimmer / LoadingDots) — these are leaf
  // primitives consumed by the six tool primitives below. They MUST be in the
  // registry so `npx shadcn add edit-tool` can resolve their sibling imports.
  // -------------------------------------------------------------------------
  {
    name: "text-shimmer",
    title: "Text Shimmer",
    description:
      "Animated text shimmer used as the streaming-header substrate for the chat tool-family.",
    source: "primitives/text-shimmer.tsx",
    layer: "animation",
  },
  {
    name: "loading-dots",
    title: "Loading Dots",
    description: "Three-dot bouncing loader; reused inside EditTool's approval footer.",
    source: "primitives/loading-dots.tsx",
    layer: "animation",
  },
  // -------------------------------------------------------------------------
  // Chat tool-family — inline AI tool-call rendering primitives. Siblings of
  // each other; see `project_tool_family_primitives` memory for the boundary
  // with AgentPlan (dashboard hierarchical planner).
  // -------------------------------------------------------------------------
  {
    name: "edit-tool",
    title: "Edit Tool",
    description:
      "Inline AI tool-call rendering for file edits — Cursor / Claude Code-style diff block with optional approval footer.",
    source: "primitives/edit-tool.tsx",
    layer: "business",
  },
  {
    name: "question-tool",
    title: "Question Tool",
    description:
      "Inline AI tool-call rendering of a multi-step questionnaire — single / multi / text question kinds.",
    source: "primitives/question-tool.tsx",
    layer: "business",
  },
  {
    name: "mcp-tool",
    title: "MCP Tool",
    description:
      "Inline AI tool-call rendering for MCP invocations — verb conjugation, priority-sorted args, expandable output panel.",
    source: "primitives/mcp-tool.tsx",
    layer: "business",
  },
  {
    name: "todo-tool",
    title: "Todo Tool",
    description:
      "Flat streaming todo list for the Claude TodoWrite tool — sibling of EditTool / McpTool / SearchTool.",
    source: "primitives/todo-tool.tsx",
    layer: "business",
  },
  {
    name: "search-tool",
    title: "Search Tool",
    description:
      "Inline AI tool-call rendering for search/retrieval results — honest-link rows, scrollable result panel.",
    source: "primitives/search-tool.tsx",
    layer: "business",
  },
  {
    name: "subagent-tool",
    title: "Subagent Tool",
    description:
      "Single-line status pill for delegated subagent invocations — lightest member of the chat tool-family.",
    source: "primitives/subagent-tool.tsx",
    layer: "business",
  },
  // -------------------------------------------------------------------------
  // Chat composer primitives — separate from the chat tool-family above.
  // These render *user input* (uploaded files etc.), not AI output.
  // -------------------------------------------------------------------------
  {
    name: "file-attachment",
    title: "File Attachment",
    description:
      "Chip / thumbnail display for an attached file in a chat composer or message bubble. Keyboard-accessible removal.",
    source: "primitives/file-attachment.tsx",
    layer: "business",
  },
  // -------------------------------------------------------------------------
  // Marketing — composed showcase pieces.
  // -------------------------------------------------------------------------
  {
    name: "expandable-gallery",
    title: "Expandable Gallery",
    description:
      "Fanned photo stack that animates into a responsive grid. Tab/Enter expands; outside-click or Back collapses.",
    source: "primitives/expandable-gallery.tsx",
    layer: "marketing",
  },
  // -------------------------------------------------------------------------
  // Dashboard — scannable-surface primitives.
  // RelativeTimeCard composes ContextCard which composes Tooltip; the leaf
  // primitives must precede their consumers so `npx shadcn add` can resolve
  // the chain without dangling sibling imports.
  // -------------------------------------------------------------------------
  {
    name: "tooltip",
    title: "Tooltip",
    description:
      "Radix Tooltip wrapper used as the substrate for ContextCard and RelativeTimeCard.",
    source: "primitives/tooltip.tsx",
    layer: "business",
  },
  {
    name: "context-card",
    title: "Context Card",
    description:
      "Geist-style hover card built on Radix Tooltip — used wherever a row needs an at-a-glance detail popover.",
    source: "primitives/context-card.tsx",
    layer: "business",
  },
  {
    name: "relative-time-card",
    title: "Relative Time Card",
    description:
      "Short relative-time label with hover popover showing absolute UTC + local time. Adaptive tick cadence.",
    source: "primitives/relative-time-card.tsx",
    layer: "dashboard",
  },
  {
    name: "project-banner",
    title: "Project Banner",
    description:
      "Full-width, non-dismissible banner for project-wide states needing resolution. Four severity variants + ARIA live region.",
    source: "primitives/project-banner.tsx",
    layer: "dashboard",
  },
  // -------------------------------------------------------------------------
  // Marketing chrome.
  // -------------------------------------------------------------------------
  {
    name: "browser-mockup",
    title: "Browser",
    description:
      "Geist-style browser chrome around a screenshot or demo. Middle-truncating address bar, aspect-locked image viewport.",
    source: "primitives/browser-mockup.tsx",
    layer: "marketing",
  },
  {
    name: "choicebox",
    title: "Choicebox",
    description:
      "Card-style selection control with radio (single) and checkbox (multi) modes. Roving tabindex + arrow-key navigation.",
    source: "primitives/choicebox.tsx",
    layer: "business",
  },
  {
    name: "code-block",
    title: "Code Block",
    description:
      "Syntax-highlighted code viewer with copy + diff lines. Accepts Geist single-file children API or Nebutra multi-file tabs.",
    source: "primitives/code-block.tsx",
    layer: "business",
  },
];

// ---------------------------------------------------------------------------
// CSS Variable → Hex mapping
// ---------------------------------------------------------------------------

/**
 * Build a `--var-name` → hex map by parsing
 *   export const ColorNebutraBlue500 = "#0033fe";
 * style declarations from the design-tokens TS output.
 *
 * The token names follow PascalCase concat — we transform them to the
 * canonical CSS variable name used in components (lower-kebab,
 * `--blue-9`, `--neutral-1`, `--brand-gradient`, etc.).
 */
function buildTokenMap(filePath: string): Record<string, string> {
  const source = readFileSync(filePath, "utf-8");
  const decls = [...source.matchAll(/export const (\w+) = ["']([^"']+)["'];/g)];
  const map: Record<string, string> = {};

  for (const [, ident, value] of decls) {
    // ColorNebutraBlue500 → blue-9 (12-step scale: 50→1, 100→2, 200→3, ... 950→12)
    const blueMatch = ident.match(/^ColorNebutraBlue(\d+)$/);
    if (blueMatch) {
      map[`--blue-${scaleStepFor(blueMatch[1])}`] = value;
      continue;
    }
    const cyanMatch = ident.match(/^ColorNebutraCyan(\d+)$/);
    if (cyanMatch) {
      map[`--cyan-${scaleStepFor(cyanMatch[1])}`] = value;
      continue;
    }
    const neutralMatch = ident.match(/^ColorNebutraNeutral(\d+)$/);
    if (neutralMatch) {
      map[`--neutral-${scaleStepFor(neutralMatch[1])}`] = value;
      continue;
    }

    if (ident === "ColorTertiaryPurple") map["--brand-tertiary"] = value;
    else if (ident === "ColorStatusDanger") map["--status-danger"] = value;
    else if (ident === "ColorStatusWarning") map["--status-warning"] = value;
    else if (ident === "ColorStatusSuccess") map["--status-success"] = value;
    else if (ident === "ColorWhite") map["--color-white"] = value;
    else if (ident === "ColorBlack") map["--color-black"] = value;
    else if (ident === "SizeContainerText") map["--container-text"] = value;
    else if (ident === "SizeContainerContent") map["--container-content"] = value;
    else if (ident === "SizeContainerWide") map["--container-wide"] = value;
    else if (/^SizeRadius/.test(ident)) {
      // SizeRadiusXl → --radius-xl
      const suffix = ident
        .replace(/^SizeRadius/, "")
        .replace(/([A-Z])/g, (_, c) => `-${c.toLowerCase()}`)
        .replace(/^-/, "");
      map[`--radius-${suffix || "default"}`] = value;
    }
  }

  // Brand aliases derived from the scale entries.
  if (map["--blue-9"]) map["--brand-primary"] = map["--blue-9"];
  if (map["--cyan-9"]) map["--brand-accent"] = map["--cyan-9"];
  if (map["--blue-9"] && map["--cyan-9"]) {
    map["--brand-gradient"] =
      `linear-gradient(135deg, ${map["--blue-9"]} 0%, ${map["--cyan-9"]} 100%)`;
  }

  return map;
}

/**
 * Map the legacy 50/100/.../950 scale to the Radix-style 1..12 step
 * convention used across CSS variables (per CLAUDE.md token reference,
 * where `--blue-9 = #0033FE` is the primary brand fill = legacy 500).
 *
 * Convention:
 *   1 = lightest app background      (legacy 50)
 *   2 = subtle background            (legacy 100)
 *   3 = component background         (legacy 200)
 *   4 = component hover              (legacy 300)
 *   5 = component active             (legacy 400)
 *   9 = solid fill / brand           (legacy 500)
 *   10 = solid hover                 (legacy 600)
 *   11 = low-contrast text           (legacy 700)
 *   12 = high-contrast text          (legacy 800/900/950 collapse)
 */
function scaleStepFor(legacy: string): number {
  const map: Record<string, number> = {
    "50": 1,
    "100": 2,
    "200": 3,
    "300": 4,
    "400": 5,
    "500": 9,
    "600": 10,
    "700": 11,
    "800": 12,
    "900": 12,
    "950": 12,
  };
  return map[legacy] ?? 9;
}

// ---------------------------------------------------------------------------
// Import / dependency parsing
// ---------------------------------------------------------------------------

/** Packages that consumers always have — never list as deps. */
const SKIP_DEPS = new Set([
  "react",
  "react-dom",
  "next",
  "next/navigation",
  "next/dynamic",
  "next/image",
  "next/link",
  "next/font",
  "next/headers",
  "next/server",
]);

/**
 * Sibling primitives that exist as standard shadcn/ui components upstream.
 * When a TIER B component imports one of these, we resolve it to the bare
 * registry name so `npx shadcn add ...` resolves it from the user's
 * configured base registry (default = ui.shadcn.com).
 */
const TIER_A_PRIMITIVES = new Set([
  "button",
  "card",
  "input",
  "label",
  "dialog",
  "tooltip",
  "popover",
  "command",
  "select",
  "separator",
  "badge",
  "skeleton",
  "textarea",
]);

function topLevelPackage(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

/**
 * Best-effort resolver for relative imports inside `primitives/`:
 *   "./button"          → registry dep "button"
 *   "./card"            → registry dep "card"
 *   "../utils/cn"       → drop (assumed available via @/lib/utils)
 *   "./command"         → registry dep "command"
 */
function relativeImportToRegistryDep(specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const lastSegment = specifier.split("/").pop() ?? "";
  // Skip utility/internal modules
  if (lastSegment === "cn" || lastSegment === "utils") return null;
  if (specifier.includes("../utils") || specifier.includes("../tokens")) return null;
  // Anything still relative inside primitives/ is a sibling component
  if (specifier.startsWith("./") && !specifier.includes("/")) {
    return null; // covered by .split logic below
  }
  // Keep only the bare filename portion
  return lastSegment.replace(/\.tsx?$/, "");
}

interface ParsedDeps {
  npmPackages: string[];
  registryDeps: string[];
  warnings: string[];
}

function parseImports(source: string, knownRegistry: Set<string>): ParsedDeps {
  const npmSet = new Set<string>();
  const registrySet = new Set<string>();
  const warnings: string[] = [];

  const importPattern = /\bfrom\s+["']([^"']+)["']/g;
  for (const m of source.matchAll(importPattern)) {
    const spec = m[1];
    if (SKIP_DEPS.has(spec)) continue;

    if (spec.startsWith(".")) {
      // Sibling component → registry dep
      const dep = relativeImportToRegistryDep(spec);
      if (!dep || ["cn", "utils"].includes(dep)) {
        continue;
      }
      if (knownRegistry.has(dep)) {
        registrySet.add(dep);
        continue;
      }
      if (TIER_A_PRIMITIVES.has(dep)) {
        // shadcn upstream resolves this — bare name only
        registrySet.add(dep);
        continue;
      }
      // Unknown sibling — emit a warning but don't fail
      warnings.push(`Sibling import "${spec}" not yet in registry`);
      continue;
    }

    if (spec.startsWith("node:")) continue;

    const pkg = topLevelPackage(spec);
    if (!pkg) continue;

    // Internal monorepo @nebutra/* — handle special-cases
    if (pkg === "@nebutra/ui") {
      // Path like @nebutra/ui/utils — drop, replaced by @/lib/utils
      continue;
    }
    if (pkg === "@nebutra/brand") {
      // Tokens-style internal — pull as npm dep so external users can install
      npmSet.add(pkg);
      continue;
    }
    if (pkg === "@nebutra/tokens") {
      // Drop — tokens layer is set up via the nebutra-tokens registry:theme entry
      continue;
    }

    npmSet.add(pkg);
  }

  return {
    npmPackages: [...npmSet].sort(),
    registryDeps: [...registrySet].sort(),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// CSS variable scanner
// ---------------------------------------------------------------------------

function collectCssVars(source: string): string[] {
  const vars = new Set<string>();
  for (const m of source.matchAll(/var\((--[a-z0-9-]+)/gi)) {
    vars.add(m[1]);
  }
  return [...vars].sort();
}

function buildCssVarFallbacks(
  used: string[],
  light: Record<string, string>,
  dark: Record<string, string>,
): { light: Record<string, string>; dark: Record<string, string> } | undefined {
  if (used.length === 0) return undefined;

  const lightOut: Record<string, string> = {};
  const darkOut: Record<string, string> = {};

  for (const varName of used) {
    if (light[varName]) lightOut[varName] = light[varName];
    if (dark[varName]) darkOut[varName] = dark[varName];
  }

  if (Object.keys(lightOut).length === 0 && Object.keys(darkOut).length === 0) {
    return undefined;
  }

  return { light: lightOut, dark: darkOut };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function readSource(spec: ComponentSpec): string {
  const path = join(UI_ROOT, "src", spec.source);
  return readFileSync(path, "utf-8");
}

function buildOne(
  spec: ComponentSpec,
  knownRegistry: Set<string>,
  lightMap: Record<string, string>,
  darkMap: Record<string, string>,
): { item: ShadcnRegistryItem; warnings: string[]; sizeBytes: number } {
  const source = readSource(spec);
  const deps = parseImports(source, knownRegistry);
  const cssVarsUsed = collectCssVars(source);
  const fallbacks = buildCssVarFallbacks(cssVarsUsed, lightMap, darkMap);

  const targetPath = spec.targetPath ?? `components/ui/${spec.name}.tsx`;

  const item: ShadcnRegistryItem = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: spec.name,
    type: spec.type ?? "registry:ui",
    title: spec.title,
    description: spec.description,
    author: "Nebutra <ui.nebutra.com>",
    ...(deps.npmPackages.length > 0 && { dependencies: deps.npmPackages }),
    ...(deps.registryDeps.length > 0 && { registryDependencies: deps.registryDeps }),
    files: [
      {
        path: targetPath,
        type: spec.type ?? "registry:ui",
        target: targetPath,
        content: source,
      },
    ],
    ...(fallbacks && { cssVars: fallbacks }),
    meta: {
      nebutraTokens: cssVarsUsed,
      nebutraLayer: spec.layer,
    },
  };

  const json = `${JSON.stringify(item, null, 2)}\n`;
  return { item, warnings: deps.warnings, sizeBytes: Buffer.byteLength(json, "utf-8") };
}

function buildThemeEntry(
  lightMap: Record<string, string>,
  darkMap: Record<string, string>,
): ShadcnRegistryItem {
  // Curated subset that matches CLAUDE.md token reference.
  const tokens = [
    "--neutral-1",
    "--neutral-2",
    "--neutral-7",
    "--neutral-9",
    "--neutral-11",
    "--neutral-12",
    "--blue-3",
    "--blue-9",
    "--cyan-9",
    "--brand-primary",
    "--brand-accent",
    "--brand-tertiary",
    "--brand-gradient",
    "--status-danger",
    "--status-warning",
    "--status-success",
    "--container-text",
    "--container-content",
    "--container-wide",
  ];

  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  for (const t of tokens) {
    if (lightMap[t]) light[t] = lightMap[t];
    if (darkMap[t]) dark[t] = darkMap[t];
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "nebutra-tokens",
    type: "registry:theme",
    title: "Nebutra Tokens",
    description:
      "Drops the Nebutra design-system CSS variables (brand, neutral, status, container scale) into globals.css. No TSX.",
    author: "Nebutra <ui.nebutra.com>",
    files: [],
    cssVars: { light, dark },
    meta: {
      nebutraTokens: tokens,
      nebutraLayer: "decoration",
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const lightMap = buildTokenMap(TOKENS_LIGHT);
  const darkMap = buildTokenMap(TOKENS_DARK);

  mkdirSync(OUT_DIR, { recursive: true });

  const knownRegistry = new Set(COMPONENT_REGISTRY.map((c) => c.name));

  const allWarnings: string[] = [];
  const sizeReport: Array<{ name: string; sizeKb: string }> = [];

  // 1) Component registry items
  for (const spec of COMPONENT_REGISTRY) {
    const { item, warnings, sizeBytes } = buildOne(spec, knownRegistry, lightMap, darkMap);
    const outPath = join(OUT_DIR, `${spec.name}.json`);
    writeFileSync(outPath, `${JSON.stringify(item, null, 2)}\n`, "utf-8");
    sizeReport.push({ name: spec.name, sizeKb: (sizeBytes / 1024).toFixed(2) });
    for (const w of warnings) allWarnings.push(`[${spec.name}] ${w}`);
  }

  // 2) registry:theme entry
  const themeItem = buildThemeEntry(lightMap, darkMap);
  const themeJson = `${JSON.stringify(themeItem, null, 2)}\n`;
  const themeOut = join(OUT_DIR, "nebutra-tokens.json");
  writeFileSync(themeOut, themeJson, "utf-8");
  sizeReport.push({
    name: "nebutra-tokens",
    sizeKb: (Buffer.byteLength(themeJson, "utf-8") / 1024).toFixed(2),
  });

  // 3) Index manifest
  const index = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "nebutra-ui",
    homepage: "https://ui.nebutra.com",
    items: [
      ...COMPONENT_REGISTRY.map((c) => ({
        name: c.name,
        type: c.type ?? "registry:ui",
        title: c.title,
        description: c.description,
      })),
      {
        name: themeItem.name,
        type: themeItem.type,
        title: themeItem.title,
        description: themeItem.description,
      },
    ],
  };
  writeFileSync(OUT_INDEX, `${JSON.stringify(index, null, 2)}\n`, "utf-8");

  // ---- Report ----
  process.stdout.write(`[registry] wrote ${sizeReport.length} manifests:\n`);
  for (const row of sizeReport) {
    process.stdout.write(`  - ${row.name}: ${row.sizeKb} KB\n`);
  }
  process.stdout.write(`[registry] index → ${OUT_INDEX}\n`);
  if (allWarnings.length > 0) {
    process.stderr.write(`[registry] warnings:\n`);
    for (const w of allWarnings) process.stderr.write(`  ! ${w}\n`);
  }
}

main();
