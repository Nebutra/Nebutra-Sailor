#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const includeRoots = ["apps", "packages", "backends"];
const skipDirs = new Set([
  ".git",
  ".next",
  ".open-next",
  ".source",
  ".turbo",
  ".venv",
  "build",
  "coverage",
  "dist",
  "out",
  "node_modules",
  "storybook-static",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss"]);
const args = process.argv.slice(2);
const shouldPrintDetails = args.includes("--details");
const shouldPrintJson = args.includes("--json");
const detailLimitArg = args.find((arg) => arg.startsWith("--limit="));
const detailLimit = detailLimitArg ? Number.parseInt(detailLimitArg.split("=")[1] ?? "", 10) : 25;
const writeOut = (message = "") => process.stdout.write(`${message}\n`);
const writeErr = (message = "") => process.stderr.write(`${message}\n`);

const patterns = {
  directMotionImport: /from ["'](?:framer-motion|motion\/react)["']/u,
  motionApi: /\bAnimatePresence\b|\bLayoutGroup\b|\blayoutId\b|<motion\.|<m\.|\bmotion\.[A-Z_$]/u,
  gsapImport: /from ["'](?:@gsap\/react|gsap(?:\/[^"']*)?)["']/u,
  gsapRuntime:
    /\bgsap\.(?:to|from|fromTo|timeline|set|quickTo|matchMedia)\b|\bScrollTrigger\b|\buseGSAP\b|window\.gsap/u,
  cssAnimation: /@keyframes|\banimation\s*:|\banimationName\b|\banimate-[\w-]+/u,
  transitionAll: /\btransition-all\b|transition\s*:\s*all\b/u,
  reducedMotion:
    /prefers-reduced-motion|useReducedMotion|motion-reduce|reduceMotion|shouldReduceMotion|prefersReduced/u,
  layoutAnimation: /\blayout(?:=|\b)|\blayoutId\b/u,
};

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(absolute, files);
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (/(?:^|\/)test\.(?:css|html)$/u.test(relative)) continue;
      files.push(relative);
    }
  }

  return files;
}

function zoneFor(file) {
  if (
    file.startsWith("apps/landing/") ||
    file.startsWith("packages/commerce/marketing/") ||
    file.startsWith("packages/design/ui/src/marketing/")
  ) {
    return "Marketing";
  }
  if (file.startsWith("apps/sailor-docs/") || file.startsWith("apps/storybook/")) {
    return "Documentation";
  }
  if (
    file.startsWith("apps/web/") ||
    file.startsWith("apps/idp/") ||
    file.startsWith("packages/design/ui/src/components/") ||
    file.startsWith("packages/design/ui/src/primitives/") ||
    file.startsWith("packages/design/ui/src/shared/animation/") ||
    file.startsWith("packages/design/ui/src/layout/") ||
    file.startsWith("packages/iam/") ||
    file.startsWith("packages/platform/") ||
    file.startsWith("packages/integrations/") ||
    file.startsWith("backends/")
  ) {
    return "Product";
  }
  return "Other";
}

function isSharedMotionLayer(file) {
  return (
    file === "apps/web/src/shared/motion.ts" ||
    file === "apps/landing/src/shared/motion.ts" ||
    file === "apps/design-docs/src/shared/motion.ts" ||
    file === "apps/sailor-docs/src/shared/motion.ts" ||
    file.startsWith("packages/design/ui/src/shared/animation/motion/")
  );
}

function isAllowedGsapLayer(file) {
  return (
    file.startsWith("apps/landing/src/shared/animation/gsap/") ||
    // TypeLens product shell — dedicated motion runtime (not marketing landing hooks)
    file.startsWith("apps/typelens/src/lib/motion/") ||
    file === "apps/typelens/src/components/type-lens-motion.tsx" ||
    file === "apps/typelens/src/styles/shell.css"
  );
}

function delegatesReducedMotion(source) {
  return /from ["']@nebutra\/ui\/components["'][\s\S]*\bAnimateIn\b/u.test(source);
}

function isTestFile(file) {
  return /(?:^|\/)__tests__\/|\.test\.[cm]?[jt]sx?$|\.spec\.[cm]?[jt]sx?$/u.test(file);
}

const files = includeRoots.flatMap((segment) => walk(path.join(root, segment)));
const summary = new Map();
const findings = [];
const violations = [];

for (const file of files) {
  const source = readFileSync(path.join(root, file), "utf8");
  const zone = zoneFor(file);
  const bucket = summary.get(zone) ?? {
    files: 0,
    directMotionImports: 0,
    allowedDirectMotionImports: 0,
    motionApi: 0,
    gsap: 0,
    cssAnimation: 0,
    transitionAll: 0,
    motionWithoutReduced: 0,
    layoutAnimation: 0,
  };

  bucket.files += 1;

  const hit = {
    directMotionImport: patterns.directMotionImport.test(source),
    motionApi: patterns.motionApi.test(source),
    gsap: patterns.gsapImport.test(source) || patterns.gsapRuntime.test(source),
    cssAnimation: patterns.cssAnimation.test(source),
    transitionAll: !isTestFile(file) && patterns.transitionAll.test(source),
    reducedMotion: patterns.reducedMotion.test(source),
    layoutAnimation: patterns.motionApi.test(source) && patterns.layoutAnimation.test(source),
  };
  const hasReducedMotionPolicy = hit.reducedMotion || delegatesReducedMotion(source);
  const allowedDirectMotionImport = hit.directMotionImport && isSharedMotionLayer(file);
  const ungovernedDirectMotionImport = hit.directMotionImport && !allowedDirectMotionImport;

  if (ungovernedDirectMotionImport) bucket.directMotionImports += 1;
  if (allowedDirectMotionImport) bucket.allowedDirectMotionImports += 1;
  if (hit.motionApi) bucket.motionApi += 1;
  if (hit.gsap) bucket.gsap += 1;
  if (hit.cssAnimation) bucket.cssAnimation += 1;
  if (hit.transitionAll) bucket.transitionAll += 1;
  if (hit.motionApi && !hasReducedMotionPolicy) bucket.motionWithoutReduced += 1;
  if (hit.layoutAnimation) bucket.layoutAnimation += 1;

  summary.set(zone, bucket);

  const risks = [
    ungovernedDirectMotionImport && "direct-motion-import",
    allowedDirectMotionImport && "shared-motion-layer",
    hit.gsap && "gsap",
    hit.cssAnimation && "css-animation",
    hit.transitionAll && "transition-all",
    hit.motionApi && !hasReducedMotionPolicy && "missing-reduced-motion",
    hit.layoutAnimation && "layout-animation",
  ].filter(Boolean);

  if (risks.length > 0) {
    findings.push({ file, zone, risks, ...hit });
  }

  if (hit.gsap && !isAllowedGsapLayer(file)) {
    violations.push({
      file,
      rule: "GSAP must live behind landing gsap hooks or typelens motion runtime",
    });
  }

  if (ungovernedDirectMotionImport) {
    violations.push({
      file,
      rule: "Motion imports must go through shared motion facades or packages/design/ui/src/shared/animation/motion",
    });
  }
}

const sortedSummary = [...summary.entries()].sort(([a], [b]) => a.localeCompare(b));

if (shouldPrintJson) {
  writeOut(
    JSON.stringify(
      {
        summary: Object.fromEntries(sortedSummary),
        findings,
        violations,
      },
      null,
      2,
    ),
  );
} else {
  writeOut("Animation governance summary");
  for (const [zone, bucket] of sortedSummary) {
    writeOut(
      `${zone}: files=${bucket.files}, directMotion=${bucket.directMotionImports}, motionApi=${bucket.motionApi}, gsap=${bucket.gsap}, cssAnimation=${bucket.cssAnimation}, transitionAll=${bucket.transitionAll}, missingReduced=${bucket.motionWithoutReduced}, layoutAnimation=${bucket.layoutAnimation}`,
    );
    if (bucket.allowedDirectMotionImports > 0) {
      writeOut(`${zone}: sharedMotionLayer=${bucket.allowedDirectMotionImports}`);
    }
  }

  if (shouldPrintDetails) {
    writeOut("\nAnimation governance details");
    for (const zone of [...new Set(findings.map((finding) => finding.zone))].sort()) {
      const zoneFindings = findings
        .filter((finding) => finding.zone === zone)
        .slice(0, detailLimit);
      writeOut(
        `${zone}: showing ${zoneFindings.length}/${findings.filter((finding) => finding.zone === zone).length}`,
      );
      for (const finding of zoneFindings) {
        writeOut(`- ${finding.file}: ${finding.risks.join(", ")}`);
      }
    }
  }
}

if (violations.length > 0) {
  writeErr("\nAnimation governance violations:");
  for (const violation of violations) {
    writeErr(`- ${violation.file}: ${violation.rule}`);
  }
  process.exit(1);
}

writeOut(`\nAnimation governance passed (${findings.length} animated files audited).`);
