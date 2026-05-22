#!/usr/bin/env node
/* eslint-env node */

/**
 * Design docs information-architecture guard.
 *
 * This is intentionally stricter than a link checker: it validates the
 * relationship between docs navigation, locale parity, component previews, and
 * public registry manifests so design-docs stays a source of truth instead of
 * a pile of MDX pages that happens to build.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..", "..");
const DOCS_DIR = path.join(ROOT, "content", "docs");
const SECTIONS = ["components", "foundations", "fragment-components", "patterns", "api"];
const LANGS = ["en", "zh"];
const LOCALIZED_FRONTMATTER_KEYS = new Set(["title", "description"]);
const REGISTRY_OWNED_FRONTMATTER_KEYS = [
  "status",
  "layer",
  "package",
  "source",
  "primitive",
  "substrate",
  "registry",
  "lastVerified",
];
const DOCS_METADATA_ENUMS = {
  status: new Set(["stable", "beta", "deprecated", "experimental"]),
  layer: new Set(["foundation", "primitive", "composition", "pattern", "registry", "api", "guide"]),
  package: new Set(["@nebutra/ui", "@nebutra/tokens"]),
  substrate: new Set(["native", "custom", "mixed"]),
};

const rootNavigationContract = {
  en: [
    "--- Start Here ---",
    "--- Foundations ---",
    "--- Primitives ---",
    "--- Product Surfaces ---",
    "--- Operating Patterns ---",
    "--- API Contracts ---",
    "--- Registry ---",
  ],
  zh: [
    "--- 开始 ---",
    "--- 基础系统 ---",
    "--- 原语 ---",
    "--- 产品表面 ---",
    "--- 运行模式 ---",
    "--- API 契约 ---",
    "--- Registry ---",
  ],
};

const componentNavigationContract = {
  en: [
    "--- Start Here ---",
    "--- Forms & Inputs ---",
    "--- Actions & Commands ---",
    "--- Navigation ---",
    "--- Overlays & Disclosure ---",
    "--- Feedback & Status ---",
    "--- Data Display ---",
    "--- Layout & Typography ---",
    "--- AI & Agent Surfaces ---",
    "--- Motion & Effects ---",
    "--- Marketing & Content Blocks ---",
    "--- Media & Mockups ---",
    "--- Registry Fixtures ---",
  ],
  zh: [
    "--- 开始 ---",
    "--- 表单与输入 ---",
    "--- 操作与命令 ---",
    "--- 导航 ---",
    "--- 弹层与展开 ---",
    "--- 反馈与状态 ---",
    "--- 数据展示 ---",
    "--- 布局与排版 ---",
    "--- AI 与 Agent 表面 ---",
    "--- 动效与视觉效果 ---",
    "--- 营销与内容区块 ---",
    "--- 媒体与样机 ---",
    "--- Registry 夹具 ---",
  ],
};

const demoOnlyPreviewAllowlist = new Map([
  ["alert-dialog-custom-demo", "variant fixture for alert-dialog visual regression"],
  ["avatar-dicebear-simple-demo", "registry/simple avatar fixture"],
  ["avatar-fallback-demo", "variant exported from avatar-demo file"],
  ["avatar-fallback-simple-demo", "registry/simple avatar fixture"],
  ["avatar-git-simple-demo", "registry/simple avatar fixture"],
  ["avatar-group-simple-demo", "registry/simple avatar fixture"],
  ["avatar-smart-group-demo", "registry/simple avatar fixture"],
  ["badge-pill-demo", "density fixture covered by badge matrix docs"],
  ["breadcrumb-ellipsis-demo", "overflow fixture for breadcrumb docs"],
  ["card-with-icon-demo", "card variant fixture"],
  ["carousel-multiple-demo", "carousel variant fixture"],
  ["carousel-vertical-demo", "carousel orientation fixture"],
  ["checkbox-indeterminate-demo", "checkbox state fixture"],
  ["choicebox-radio-demo", "choicebox radio-mode fixture"],
  ["combobox-3-demo", "combobox scenario fixture"],
  ["combobox-4-demo", "combobox scenario fixture"],
  ["combobox-5-demo", "combobox scenario fixture"],
  ["combobox-6-demo", "combobox scenario fixture"],
  ["combobox-7-demo", "combobox scenario fixture"],
  ["combobox-8-demo", "combobox scenario fixture"],
  ["combobox-9-demo", "combobox scenario fixture"],
  ["combobox-10-demo", "combobox scenario fixture"],
  ["command-dialog-simple-demo", "simple command-dialog fixture"],
  ["dialog-destructive-demo", "dialog destructive-flow fixture"],
  ["drawer-side-right-demo", "drawer placement fixture"],
  ["dropdown-menu-radio-group-demo", "dropdown-menu radio-group fixture"],
  ["dropdown-menu-sub-demo", "dropdown-menu sub-menu fixture"],
  ["grid-system-demo", "foundation grid visual fixture"],
  ["hex-grid-demo", "brand pattern visual fixture"],
  ["input-2-demo", "input secondary fixture"],
  ["introduction-demo", "legacy component-index fixture"],
  ["label-description-demo", "label helper-text fixture"],
  ["label-disabled-demo", "label disabled-state fixture"],
  ["page-container-demo", "fragment component fixture"],
  ["popover-controlled-demo", "popover controlled-state fixture"],
  ["popover-settings-demo", "popover settings-content fixture"],
  ["progress-custom-color-demo", "progress threshold-color fixture"],
  ["progress-indeterminate-demo", "progress indeterminate fixture"],
  ["progress-with-label-demo", "progress label fixture"],
  ["radio-group-horizontal-demo", "radio-group layout fixture"],
  ["reaction-chip-demo", "content-block fixture"],
  ["scroll-area-list-demo", "scroll-area overflow fixture"],
  ["separator-vertical-demo", "separator orientation fixture"],
  ["separator-with-text-demo", "separator label fixture"],
  ["separator-with-text-i-18n-demo", "separator i18n label fixture"],
  ["skeleton-list-demo", "skeleton list fixture"],
  ["slider-icon-demo", "slider icon-control fixture"],
  ["slider-number-flow-demo", "slider animated-number fixture"],
  ["slider-on-value-change-demo", "slider callback fixture"],
  ["slider-stateful-demo", "slider controlled-state fixture"],
  ["textarea-2-demo", "textarea secondary fixture"],
  ["textarea-3-demo", "textarea secondary fixture"],
  ["toggle-group-single-demo", "toggle-group single-select fixture"],
  ["toggle-large-demo", "toggle size fixture"],
  ["toggle-small-demo", "toggle size fixture"],
]);

const previewDeletionCandidates = new Map();

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stripCodeBlocks(source) {
  return source.replace(/```[\s\S]*?```/g, "");
}

function stripInlineCode(source) {
  return source.replace(/`[^`\n]*`/g, "");
}

function parseFrontmatter(file) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) continue;
    fields[field[1]] = field[2].trim().replace(/^"|"$/g, "");
  }
  return fields;
}

function listMdxSlugs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
    .sort();
}

function listedPages(metaFile) {
  const meta = readJson(metaFile);
  return meta.pages.filter((entry) => typeof entry === "string" && !entry.startsWith("---"));
}

function listedSectionHeaders(metaFile) {
  const meta = readJson(metaFile);
  return meta.pages.filter((entry) => typeof entry === "string" && entry.startsWith("---"));
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function collectMdxFiles(dir = DOCS_DIR) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdxFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(absolute);
    }
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file);
}

function hasPreview(source) {
  return /<ComponentPreview\s+[^>]*name=["'][^"']+["']/.test(source);
}

function hasHeading(source, pattern) {
  return pattern.test(stripCodeBlocks(source));
}

function hasAnyHeading(source, patterns) {
  return patterns.some((pattern) => hasHeading(source, pattern));
}

function assertNavigationContract(lang) {
  const rootMetaFile = path.join(DOCS_DIR, lang, "meta.json");
  const rootHeaders = listedSectionHeaders(rootMetaFile);
  const missingRootHeaders = rootNavigationContract[lang].filter(
    (header) => !rootHeaders.includes(header),
  );

  if (missingRootHeaders.length > 0) {
    fail(`${lang}/meta.json is missing navigation groups: ${missingRootHeaders.join(", ")}`);
  }

  const componentMetaFile = path.join(DOCS_DIR, lang, "components", "meta.json");
  const componentHeaders = listedSectionHeaders(componentMetaFile);
  const missingComponentHeaders = componentNavigationContract[lang].filter(
    (header) => !componentHeaders.includes(header),
  );

  if (missingComponentHeaders.length > 0) {
    fail(
      `${lang}/components/meta.json is missing task-oriented groups: ${missingComponentHeaders.join(", ")}`,
    );
  }

  const fragmentMeta = readJson(path.join(DOCS_DIR, lang, "fragment-components", "meta.json"));
  const expectedTitle = lang === "zh" ? "产品组合" : "Product Compositions";
  if (fragmentMeta.title !== expectedTitle) {
    fail(
      `${lang}/fragment-components/meta.json title must be "${expectedTitle}" so fragment-components is presented as product compositions.`,
    );
  }
}

function resolveTemplateProfile(item, docs) {
  const nebutraLayer = item.meta?.nebutraLayer;
  const docsLayer = item.meta?.docs?.layer;

  if (docs.section === "foundations" || docsLayer === "foundation") return "foundation";
  if (docs.section === "patterns" || docsLayer === "pattern") return "pattern";
  if (docs.section === "api" || docsLayer === "api") return "api";
  if (docs.section === "fragment-components" || nebutraLayer === "dashboard") {
    return "composition";
  }
  if (nebutraLayer === "animation" || nebutraLayer === "decoration") {
    return "visual-motion";
  }
  if (nebutraLayer === "marketing") return "composition";
  return "primitive";
}

function missingTemplateSections({ item, docs, source }) {
  const profile = resolveTemplateProfile(item, docs);
  const missing = [];
  const previewRequired =
    profile === "primitive" || profile === "composition" || profile === "visual-motion";

  if (previewRequired && !hasPreview(source)) {
    missing.push("ComponentPreview");
  }

  if (
    profile === "primitive" &&
    !hasAnyHeading(source, [/^##\s+(Usage|Installation|API|Props)\b/im])
  ) {
    missing.push("Usage/API");
  }

  if (profile === "primitive" && !hasAnyHeading(source, [/^##\s+Props\b/m, /^##\s+API\b/m])) {
    missing.push("Props");
  }

  if (
    profile === "composition" &&
    !hasAnyHeading(source, [/^##\s+(Use Case|When To Use|Usage|Demo)\b/im])
  ) {
    missing.push("Use Case");
  }

  if (
    profile === "composition" &&
    !hasAnyHeading(source, [/^##\s+(Anatomy|Props|Examples|Integration Contract)\b/im])
  ) {
    missing.push("Anatomy");
  }

  if (
    profile === "visual-motion" &&
    !hasAnyHeading(source, [/^##\s+(When to use|When To Use|Usage|Presets)\b/im])
  ) {
    missing.push("When to use");
  }

  if (
    profile === "visual-motion" &&
    !hasAnyHeading(source, [/^##\s+(Accessibility|Motion|Reduced Motion|Design Contract)\b/im])
  ) {
    missing.push("Motion/reduced-motion");
  }

  if (
    (profile === "primitive" || profile === "composition" || profile === "visual-motion") &&
    !hasAnyHeading(source, [/^##\s+Accessibility\b/m])
  ) {
    missing.push("Accessibility");
  }

  if (
    (profile === "primitive" || profile === "composition") &&
    !hasAnyHeading(source, [
      /^##\s+(Design Contract|Integration Contract|Best Practices|Governance)\b/im,
    ])
  ) {
    missing.push("Design Contract");
  }

  if (
    profile === "visual-motion" &&
    !hasAnyHeading(source, [/^##\s+(Design Contract|Token Contract|Governance)\b/im])
  ) {
    missing.push("Token Contract");
  }

  if (
    profile === "foundation" &&
    !hasAnyHeading(source, [
      /^##\s+(Token Truth|Usage|Anti-patterns|Governance|Verification|Design Contract|Best Practices)\b/im,
    ])
  ) {
    missing.push("Foundation Contract");
  }

  if (
    profile === "pattern" &&
    !hasAnyHeading(source, [
      /^##\s+(Decision Tree|Composition Rules|Failure Modes|Examples|Design Contract|Best Practices)\b/im,
    ])
  ) {
    missing.push("Pattern Contract");
  }

  if (
    profile === "api" &&
    !hasAnyHeading(source, [
      /^##\s+(Endpoint Purpose|UI States Driven By API|Errors|Loading|Empty|Endpoint)\b/im,
    ])
  ) {
    missing.push("API Contract");
  }

  return { profile, missing };
}

function assertSectionMeta(lang, section) {
  const dir = path.join(DOCS_DIR, lang, section);
  const metaFile = path.join(dir, "meta.json");
  const slugs = listMdxSlugs(dir);
  const pages = listedPages(metaFile);
  const unlisted = diff(slugs, pages);
  const missing = diff(pages, slugs);

  if (unlisted.length > 0) {
    fail(`${lang}/${section}/meta.json does not list: ${unlisted.join(", ")}`);
  }
  if (missing.length > 0) {
    fail(`${lang}/${section}/meta.json lists missing pages: ${missing.join(", ")}`);
  }
}

function assertLocaleParity(section) {
  const en = listMdxSlugs(path.join(DOCS_DIR, "en", section));
  const zh = listMdxSlugs(path.join(DOCS_DIR, "zh", section));
  const missingZh = diff(en, zh);
  const missingEn = diff(zh, en);

  if (missingZh.length > 0) {
    fail(`zh/${section} is missing pages present in en: ${missingZh.join(", ")}`);
  }
  if (missingEn.length > 0) {
    fail(`en/${section} is missing pages present in zh: ${missingEn.join(", ")}`);
  }
}

function assertLocaleFrontmatterParity(section) {
  const enDir = path.join(DOCS_DIR, "en", section);
  const zhDir = path.join(DOCS_DIR, "zh", section);
  for (const slug of listMdxSlugs(enDir)) {
    const enFile = path.join(enDir, `${slug}.mdx`);
    const zhFile = path.join(zhDir, `${slug}.mdx`);
    if (!fs.existsSync(zhFile)) continue;

    const enFrontmatter = parseFrontmatter(enFile);
    const zhFrontmatter = parseFrontmatter(zhFile);
    const governanceKeys = new Set(
      [...Object.keys(enFrontmatter), ...Object.keys(zhFrontmatter)].filter(
        (key) => !LOCALIZED_FRONTMATTER_KEYS.has(key),
      ),
    );

    for (const key of governanceKeys) {
      if (enFrontmatter[key] === zhFrontmatter[key]) continue;
      fail(
        `${section}/${slug}.mdx frontmatter "${key}" must match across en/zh: en=${enFrontmatter[key] ?? "∅"} zh=${zhFrontmatter[key] ?? "∅"}`,
      );
    }
  }
}

function assertRootIncludesApi(lang) {
  const rootMeta = readJson(path.join(DOCS_DIR, lang, "meta.json"));
  if (!rootMeta.pages.includes("...api")) {
    fail(`${lang}/meta.json must include ...api so API reference is part of docs IA`);
  }
}

function assertPreviewRegistry() {
  const mdxFiles = collectMdxFiles();
  const previewRefs = new Set();
  const previewPattern = /<ComponentPreview\s+[^>]*name=["']([^"']+)["']/g;
  for (const file of mdxFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(previewPattern)) {
      previewRefs.add(match[1]);
    }
  }

  const generatedIndex = fs.readFileSync(
    path.join(ROOT, "src", "__registry__", "index.tsx"),
    "utf8",
  );
  const previewKeys = new Set(
    [...generatedIndex.matchAll(/"([^"]+)":\s*\{\s*name:/g)].map((match) => match[1]),
  );
  const missing = [...previewRefs].filter((name) => !previewKeys.has(name)).sort();

  if (missing.length > 0) {
    fail(`ComponentPreview references missing generated demos: ${missing.join(", ")}`);
  }

  const orphaned = [...previewKeys].filter((name) => !previewRefs.has(name)).sort();
  const unclassified = orphaned.filter(
    (name) => !demoOnlyPreviewAllowlist.has(name) && !previewDeletionCandidates.has(name),
  );
  if (unclassified.length > 0) {
    fail(
      `generated previews need an MDX link, demo-only allowlist, or deletion: ${unclassified.join(", ")}`,
    );
  }

  const staleAllowlist = [...demoOnlyPreviewAllowlist.keys()].filter(
    (name) => !previewKeys.has(name),
  );
  if (staleAllowlist.length > 0) {
    fail(
      `demo-only preview allowlist references missing generated previews: ${staleAllowlist.join(", ")}`,
    );
  }

  const existingDeletionCandidates = [...previewDeletionCandidates.keys()].filter((name) =>
    previewKeys.has(name),
  );
  if (existingDeletionCandidates.length > 0) {
    fail(
      `preview deletion candidates still exist and should be removed: ${existingDeletionCandidates.join(", ")}`,
    );
  }
}

function assertRegistryDocs() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const enDocSlugs = new Set();
  for (const section of SECTIONS) {
    for (const slug of listMdxSlugs(path.join(DOCS_DIR, "en", section))) {
      enDocSlugs.add(slug);
    }
  }

  for (const item of registry.items) {
    if (enDocSlugs.has(item.name)) continue;
    fail(`registry item "${item.name}" has no matching English docs page.`);
  }
}

function assertStructuredFrontmatterContracts() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const registryItems = new Set(registry.items.map((item) => item.name));

  for (const lang of LANGS) {
    for (const section of SECTIONS) {
      for (const slug of listMdxSlugs(path.join(DOCS_DIR, lang, section))) {
        const file = path.join(DOCS_DIR, lang, section, `${slug}.mdx`);
        const frontmatter = parseFrontmatter(file);

        if (registryItems.has(slug)) {
          for (const key of REGISTRY_OWNED_FRONTMATTER_KEYS) {
            if (!frontmatter[key]) continue;
            fail(
              `${relative(file)} frontmatter "${key}" duplicates registry-owned metadata. Keep localized title/description in MDX and move governance metadata to public/registry.json.`,
            );
          }
        }

        if (frontmatter.registry === "true" && !registryItems.has(slug)) {
          fail(`${relative(file)} has registry: true but no matching registry item "${slug}".`);
        }
      }
    }
  }
}

function findDocsFile(lang, slug) {
  for (const section of SECTIONS) {
    const file = path.join(DOCS_DIR, lang, section, `${slug}.mdx`);
    if (fs.existsSync(file)) {
      return { file, section };
    }
  }
  return undefined;
}

function assertRegistryDocTemplateContracts() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const requiredRegistryMetadataKeys = [
    "status",
    "layer",
    "package",
    "source",
    "substrate",
    "registry",
    "lastVerified",
  ];

  for (const item of registry.items) {
    const docs = findDocsFile("en", item.name);
    if (!docs) continue;

    const source = fs.readFileSync(docs.file, "utf8");
    const docsMetadata = item.meta?.docs ?? {};
    const missing = [];

    for (const key of requiredRegistryMetadataKeys) {
      if (!docsMetadata[key]) {
        missing.push(`registry.meta.docs:${key}`);
      }
    }

    for (const [key, allowedValues] of Object.entries(DOCS_METADATA_ENUMS)) {
      if (!docsMetadata[key]) continue;
      if (allowedValues.has(String(docsMetadata[key]))) continue;
      fail(
        `registry item "${item.name}" meta.docs.${key} has unsupported value: ${docsMetadata[key]}`,
      );
    }

    if (docsMetadata.registry !== true) {
      missing.push("registry.meta.docs:registry=true");
    }

    if (docsMetadata.source) {
      const sourceFile = path.join(REPO_ROOT, docsMetadata.source);
      if (path.isAbsolute(docsMetadata.source)) {
        fail(`registry item "${item.name}" meta.docs.source must be repo-relative, not absolute.`);
      } else if (!fs.existsSync(sourceFile)) {
        fail(
          `registry item "${item.name}" meta.docs.source does not exist: ${docsMetadata.source}`,
        );
      }
    }

    const template = missingTemplateSections({ item, docs, source });
    missing.push(...template.missing.map((section) => `${template.profile}:${section}`));

    if (missing.length > 0) {
      fail(`${relative(docs.file)} registry docs template is incomplete: ${missing.join(", ")}.`);
    }
  }
}

function assertNoStaleSubstrateCopy() {
  const staleSubstratePattern =
    /(built on Radix|基于 Radix|@radix-ui\/react-(dialog|tooltip|popover|progress|separator|label|dropdown-menu|alert-dialog))/i;
  for (const lang of LANGS) {
    for (const file of collectMdxFiles(path.join(DOCS_DIR, lang, "components"))) {
      const source = fs.readFileSync(file, "utf8");
      if (staleSubstratePattern.test(source)) {
        fail(
          `${relative(file)} contains stale Radix substrate copy; document the current primitive contract.`,
        );
      }
    }
  }
}

function assertBrandTokenTruth() {
  const bannedDriftColors = /#(?:6366f1|3B82F6)/i;
  for (const file of collectMdxFiles(path.join(DOCS_DIR))) {
    const source = fs.readFileSync(file, "utf8");
    if (bannedDriftColors.test(source)) {
      fail(`${relative(file)} contains drifted brand color literals (#6366f1 or #3B82F6).`);
    }
  }
}

function collectStoryFiles(dir = path.join(REPO_ROOT, "packages", "design", "ui", "src")) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectStoryFiles(absolute));
    } else if (entry.isFile() && /\.stories\.(tsx|ts|mdx)$/.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

function assertStorybookCoverage() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const storyBasenames = new Set(
    collectStoryFiles().map((file) => path.basename(file).replace(/\.stories\.(tsx|ts|mdx)$/, "")),
  );

  for (const item of registry.items) {
    if (storyBasenames.has(item.name)) continue;

    const docs = findDocsFile("en", item.name);
    const docsFrontmatter = docs ? parseFrontmatter(docs.file) : {};
    const storybookPath = item.meta?.docs?.storybook ?? docsFrontmatter.storybook;
    if (storybookPath) {
      const resolved = path.join(REPO_ROOT, storybookPath);
      if (path.isAbsolute(storybookPath)) {
        fail(`registry item "${item.name}" storybook metadata must be repo-relative.`);
      } else if (!fs.existsSync(resolved)) {
        fail(
          `registry item "${item.name}" storybook metadata points to a missing file: ${storybookPath}`,
        );
      }
      continue;
    }

    fail(
      `registry item "${item.name}" needs same-name Storybook coverage or explicit storybook metadata.`,
    );
  }
}

const zhTemplateParentheticalSuffixes = [
  ["演示 (Demo)", /(^|[|#\s])演示\s+\(Demo\)/m],
  ["属性 (Props)", /(^|[|#\s])属性\s+\(Props\)/m],
  ["属性 (Prop)", /(^|[|#\s])属性\s+\(Prop\)/m],
  ["默认值 (Default)", /(^|[|#\s])默认值\s+\(Default\)/m],
  ["描述 (Description)", /(^|[|#\s])描述\s+\(Description\)/m],
  ["可访问性 (Accessibility)", /(^|[|#\s])可访问性\s+\(Accessibility\)/m],
  ["无障碍支持 (Accessibility)", /(^|[|#\s])无障碍支持\s+\(Accessibility\)/m],
  ["设计契约 (Design Contract)", /(^|[|#\s])设计契约\s+\(Design Contract\)/m],
];

function zhLocalizationIssues(source) {
  const body = stripInlineCode(stripCodeBlocks(source));
  const issues = [];
  const englishHeading =
    /^#{2,4}\s+(Demo|Overview|Installation|Usage|Props|Best Practices|Accessibility|Design Contract|Examples|States|Presets|Token Families|When To Use|When to use)\b/gm;
  const englishPropsTable =
    /^\|\s*Prop\s*\|\s*Type\s*\|\s*(Default|默认值)\s*\|\s*(Description|说明)\s*\|/gm;
  const placeholderCopy = /\b(TODO|TBD|Placeholder|Lorem ipsum)\b/g;

  for (const match of body.matchAll(englishHeading)) {
    issues.push(`English template heading "${match[1]}"`);
  }
  for (const [label, pattern] of zhTemplateParentheticalSuffixes) {
    if (pattern.test(body)) {
      issues.push(`English template suffix "${label}"`);
    }
  }
  if (englishPropsTable.test(body)) {
    issues.push("English props table header");
  }
  if (placeholderCopy.test(body)) {
    issues.push("placeholder copy");
  }

  return [...new Set(issues)];
}

function assertZhLocalization() {
  const zhRoot = path.join(DOCS_DIR, "zh");

  for (const file of collectMdxFiles(zhRoot)) {
    const source = fs.readFileSync(file, "utf8");
    const issues = zhLocalizationIssues(source);
    if (issues.length === 0) continue;

    fail(`${relative(file)} has Chinese-localization drift: ${issues.join(", ")}`);
  }
}

function assertApiTemplateContracts() {
  for (const lang of LANGS) {
    const apiDir = path.join(DOCS_DIR, lang, "api");
    for (const slug of listMdxSlugs(apiDir)) {
      if (slug === "index") continue;
      const file = path.join(apiDir, `${slug}.mdx`);
      const source = fs.readFileSync(file, "utf8");
      const hasPurpose =
        lang === "zh"
          ? hasHeading(source, /^##\s+接口目的/m)
          : hasHeading(source, /^##\s+Endpoint Purpose/m);
      const hasUiStates =
        lang === "zh"
          ? hasHeading(source, /^##\s+API 驱动的界面状态/m)
          : hasHeading(source, /^##\s+UI States Driven By API/m);
      const hasFailureStates =
        lang === "zh"
          ? hasHeading(source, /^##\s+错误 \/ 加载 \/ 空状态契约/m)
          : hasHeading(source, /^##\s+Errors \/ Loading \/ Empty Contracts/m);
      const missing = [];

      if (!hasPurpose) missing.push("Endpoint purpose");
      if (!hasUiStates) missing.push("UI states driven by API");
      if (!hasFailureStates) missing.push("errors/loading/empty contracts");

      if (missing.length > 0) {
        fail(`${relative(file)} API template is incomplete: ${missing.join(", ")}`);
      }
    }
  }
}

for (const lang of LANGS) {
  assertRootIncludesApi(lang);
  assertNavigationContract(lang);
  for (const section of SECTIONS) {
    assertSectionMeta(lang, section);
  }
}

for (const section of SECTIONS) {
  assertLocaleParity(section);
  assertLocaleFrontmatterParity(section);
}

assertPreviewRegistry();
assertRegistryDocs();
assertStructuredFrontmatterContracts();
assertRegistryDocTemplateContracts();
assertNoStaleSubstrateCopy();
assertBrandTokenTruth();
assertStorybookCoverage();
assertZhLocalization();
assertApiTemplateContracts();

for (const message of warnings) {
  console.warn(`[design-docs:ia] WARN ${message}`);
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`[design-docs:ia] FAIL ${message}`);
  }
  process.exit(1);
}

process.stdout.write("[design-docs:ia] OK information architecture is internally consistent\n");
