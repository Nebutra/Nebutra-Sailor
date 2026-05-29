#!/usr/bin/env node
/* eslint-env node */

/**
 * UI quality guard for design-system surfaces.
 *
 * This gate is intentionally narrower than a visual review: it blocks the
 * interaction-state mistakes that repeatedly leak browser/default behavior into
 * docs and public primitives. Broader visual debt is reported as warnings so
 * the backlog is visible without making the whole historical codebase unbuildable.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..", "..");

const scanRoots = [
  path.join(ROOT, "src"),
  path.join(REPO_ROOT, "packages", "design", "ui", "src", "primitives"),
  path.join(REPO_ROOT, "packages", "design", "ui", "src", "components"),
  path.join(REPO_ROOT, "packages", "design", "ui", "src", "layout"),
  path.join(
    REPO_ROOT,
    "apps",
    "landing-page",
    "src",
    "components",
    "landing",
    "features",
    "showcases",
  ),
];

const ignoredSegments = new Set([
  "__tests__",
  "__snapshots__",
  "__registry__",
  ".next",
  "node_modules",
]);

const ignoredFilePatterns = [
  /\.stories\.tsx$/u,
  /\.stories\.ts$/u,
  /\.test\.tsx$/u,
  /\.test\.ts$/u,
];

const formControlFocusContractFile = path.join(
  REPO_ROOT,
  "packages",
  "design",
  "ui",
  "src",
  "primitives",
  "form-control.ts",
);

const formControlFocusContractTokens = [
  "focus:border-ring",
  "focus:ring-[length:var(--input-focus-ring-width)]",
  "focus:ring-[length:var(--textarea-focus-ring-width)]",
  "focus:ring-[length:var(--select-focus-ring-width)]",
  "focus:ring-ring/30",
  "aria-invalid:focus:border-destructive",
  "aria-invalid:focus:ring-destructive/20",
];

const hardRules = [
  {
    id: "raw-focus-visual-state",
    pattern:
      /\b(?:focus:(?:ring|border|bg|text|shadow|z|scale)|focus-within:(?:ring|border|bg))[-\w/.[\]():%]*/gu,
    message:
      "Use focus-visible, data-highlighted, or has-[:focus-visible] instead of mouse-triggered focus visuals.",
  },
];

const ratchetRules = [
  {
    id: "motion-transition-all",
    pattern: /\btransition-all\b/gu,
    ceiling: 0,
    message: "Prefer explicit transition properties so motion remains tokenizable and predictable.",
  },
  {
    id: "motion-raw-duration",
    pattern: /\bduration-(?:75|100|150|200|300|500|700|1000)\b|\bduration-\[[^\]]+\]/gu,
    ceiling: 117,
    message: "Promote repeated timing values to motion tokens instead of raw Tailwind durations.",
  },
  {
    id: "surface-large-shadow",
    pattern: /\bshadow-(?:md|lg|xl|2xl|\[[^\]]+\])\b/gu,
    ceiling: 86,
    message:
      "Use component elevation tokens; large shadows quickly produce default SaaS card chrome.",
  },
  {
    id: "surface-large-radius",
    pattern: /\brounded-(?:xl|2xl|3xl)\b/gu,
    ceiling: 143,
    message: "Use radius tokens with restrained corners for dense product surfaces.",
  },
  {
    id: "primitive-tailwind-color",
    pattern:
      /\b(?:bg|text|border|ring|from|to|via)-(?:slate|zinc|gray|neutral|red|green|yellow|purple|indigo|amber|emerald|blue|cyan)-\d{2,3}(?:\/\d+)?\b/gu,
    ceiling: 931,
    message: "Use semantic/component tokens instead of primitive Tailwind palette classes.",
  },
  {
    id: "primitive-css-var",
    pattern: /var\(--(?:neutral|blue|cyan)-\d{1,2}\)/gu,
    ceiling: 268,
    message:
      "Docs/components should consume semantic or component tokens; direct functional scales must not spread.",
  },
  {
    id: "media-image-fill",
    pattern: /<Image\b[\s\S]*?\bfill\b[\s\S]*?\/?>/gu,
    ceiling: 6,
    message:
      "Use a dedicated relative media frame for Image fill so assets cannot escape layout bounds.",
  },
];

const advisoryRules = [];

const rawHexRule = {
  id: "raw-hex-color",
  pattern: /#[0-9A-Fa-f]{3,8}\b/gu,
  message: "Prefer semantic/component tokens over raw hex values outside accepted literal sources.",
};

const acceptedRawHexSources = {
  // Token and brand documentation intentionally renders literal source colors.
  "apps/design-docs/src/components/brand-overrides-demo.tsx": "brand-token-doc",
  "apps/design-docs/src/components/brand-overview-visuals.tsx": "brand-token-doc",
  "apps/design-docs/src/components/color-palette.tsx": "brand-token-doc",
  "apps/design-docs/src/components/color-usage.tsx": "brand-token-doc",
  "apps/design-docs/src/components/gradient-demos.tsx": "brand-token-doc",
  "apps/design-docs/src/components/theming-demos.tsx": "brand-token-doc",
  "apps/design-docs/src/components/z-index-demo.tsx": "brand-token-doc",

  // Demo fixtures document explicit custom color APIs or copied snippets.
  "apps/design-docs/src/components/badge-demos.tsx": "demo-fixture",
  "apps/design-docs/src/components/grid-layout-demos.tsx": "demo-fixture",
  "apps/design-docs/src/components/introduction-hero.tsx": "demo-fixture",
  "apps/design-docs/src/components/motion-demos.tsx": "demo-fixture",
  "apps/design-docs/src/components/pattern-demos.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/animated-hike-card-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/badge-pill-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/book-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/dithering-shader-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/dotted-map-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/file-attachment-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/flickering-grid-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/grain-gradient-background-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/highlighter-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/line-shadow-text-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/magic-card-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/shine-border-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/previews/wave-animation-demo.tsx": "demo-fixture",
  "apps/design-docs/src/components/ui/slider-1.tsx": "demo-fixture",

  // Static device and illustration SVGs keep their literal asset colors.
  "apps/design-docs/src/components/demos/macbook-pro-demo.tsx": "svg-asset",
  "apps/design-docs/src/components/previews/macbook-pro-demo.tsx": "svg-asset",
  "packages/design/ui/src/primitives/awards.tsx": "svg-asset",
  "packages/design/ui/src/primitives/book.tsx": "svg-asset",
  "packages/design/ui/src/primitives/interactive-card.tsx": "svg-asset",
  "packages/design/ui/src/primitives/macbook-pro.tsx": "svg-asset",
  "packages/design/ui/src/primitives/safari.tsx": "svg-asset",

  // Shader, canvas, or third-party adapter internals require literal colors.
  "packages/design/ui/src/primitives/confetti.tsx": "canvas-kernel",
  "packages/design/ui/src/primitives/dithering-background.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/dithering-shader.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/grain-gradient-background.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/mesh-gradient-bg.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/neuro-noise-bg.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/stars-canvas.tsx": "canvas-kernel",
  "packages/design/ui/src/primitives/waves-bg.tsx": "shader-kernel",
  "packages/design/ui/src/primitives/chart.tsx": "third-party-selector",
  "packages/design/ui/src/primitives/github-calendar.tsx": "third-party-palette",

  // Syntax/optical effects expose literal color APIs by design.
  "packages/design/ui/src/primitives/code-block.tsx": "syntax-theme",
  "packages/design/ui/src/primitives/line-shadow-text.tsx": "visual-effect-api",
  "packages/design/ui/src/primitives/text-shimmer.tsx": "visual-effect-api",

  // Low-level CSS masks need absolute black/transparent literals.
  "packages/design/ui/src/primitives/bento-grid.tsx": "css-mask",
  "packages/design/ui/src/primitives/border-trail.tsx": "css-mask",
};

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredSegments.has(entry.name)) continue;

    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolute));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|mdx)$/u.test(entry.name)) continue;
    if (ignoredFilePatterns.some((pattern) => pattern.test(entry.name))) continue;
    files.push(absolute);
  }

  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

function relative(file) {
  return path.relative(REPO_ROOT, file);
}

function scanRule(rule, file, source) {
  const findings = [];
  for (const match of source.matchAll(rule.pattern)) {
    findings.push({
      file,
      line: lineNumberFor(source, match.index ?? 0),
      token: match[0],
      message: rule.message,
    });
  }
  return findings;
}

function sourceForHardRule(rule, file, source) {
  if (rule.id !== "raw-focus-visual-state" || file !== formControlFocusContractFile) {
    return source;
  }

  let normalizedSource = source;
  for (const token of formControlFocusContractTokens) {
    normalizedSource = normalizedSource.split(token).join("form-control-focus-contract");
  }
  return normalizedSource;
}

const files = scanRoots.flatMap(collectFiles).sort();
const hardFindings = [];
const ratchetFindings = [];
const advisoryFindings = [];
const acceptedRawHexFindings = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const relativeFile = relative(file);

  for (const rule of hardRules) {
    hardFindings.push(
      ...scanRule(rule, file, sourceForHardRule(rule, file, source)).map((finding) => ({
        ...finding,
        rule,
      })),
    );
  }

  for (const rule of advisoryRules) {
    advisoryFindings.push(...scanRule(rule, file, source).map((finding) => ({ ...finding, rule })));
  }

  for (const rule of ratchetRules) {
    ratchetFindings.push(...scanRule(rule, file, source).map((finding) => ({ ...finding, rule })));
  }

  const rawHexReason = acceptedRawHexSources[relativeFile];
  const rawHexFindings = scanRule(rawHexRule, file, source);
  if (rawHexReason) {
    acceptedRawHexFindings.push(
      ...rawHexFindings.map((finding) => ({ ...finding, rule: rawHexRule, reason: rawHexReason })),
    );
  } else {
    advisoryFindings.push(...rawHexFindings.map((finding) => ({ ...finding, rule: rawHexRule })));
  }
}

if (hardFindings.length > 0) {
  process.stderr.write("[design-docs:ui-quality] hard failures\n");
  for (const finding of hardFindings) {
    process.stderr.write(
      `${relative(finding.file)}:${finding.line} ${finding.rule.id}: ${finding.token} — ${finding.message}\n`,
    );
  }
  process.exit(1);
}

const ratchetGrouped = new Map();
for (const finding of ratchetFindings) {
  const current = ratchetGrouped.get(finding.rule.id) ?? { rule: finding.rule, findings: [] };
  current.findings.push(finding);
  ratchetGrouped.set(finding.rule.id, current);
}

const ratchetFailures = [...ratchetGrouped.values()].filter(
  ({ rule, findings }) => findings.length > rule.ceiling,
);

if (ratchetFailures.length > 0) {
  process.stderr.write("[design-docs:ui-quality] ratchet failures\n");
  for (const { rule, findings } of ratchetFailures) {
    process.stderr.write(
      `${rule.id}: ${findings.length} exceeds ceiling ${rule.ceiling} — ${rule.message}\n`,
    );
    for (const finding of findings.slice(0, 20)) {
      process.stderr.write(`  ${relative(finding.file)}:${finding.line} ${finding.token}\n`);
    }
    if (findings.length > 20) {
      process.stderr.write(`  ... ${findings.length - 20} more\n`);
    }
  }
  process.exit(1);
}

if (advisoryFindings.length > 0) {
  const grouped = new Map();
  for (const finding of advisoryFindings) {
    grouped.set(finding.rule.id, (grouped.get(finding.rule.id) ?? 0) + 1);
  }
  const summary = [...grouped.entries()].map(([ruleId, count]) => `${ruleId}: ${count}`).join(", ");
  process.stderr.write(`[design-docs:ui-quality] advisory debt still present (${summary})\n`);
}

if (ratchetFindings.length > 0) {
  const summary = [...ratchetGrouped.values()]
    .map(({ rule, findings }) => `${rule.id}: ${findings.length}/${rule.ceiling}`)
    .join(", ");
  process.stderr.write(`[design-docs:ui-quality] ratchet ceilings held (${summary})\n`);
}

if (acceptedRawHexFindings.length > 0) {
  const grouped = new Map();
  for (const finding of acceptedRawHexFindings) {
    grouped.set(finding.reason, (grouped.get(finding.reason) ?? 0) + 1);
  }
  const summary = [...grouped.entries()].map(([reason, count]) => `${reason}: ${count}`).join(", ");
  process.stdout.write(`[design-docs:ui-quality] accepted raw color literals (${summary})\n`);
}

process.stdout.write(
  `[design-docs:ui-quality] OK hard UI-system rules passed (${files.length} files scanned)\n`,
);
