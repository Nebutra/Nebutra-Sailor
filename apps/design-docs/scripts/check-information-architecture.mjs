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
const PREVIEWS_DIR = path.join(ROOT, "src", "components", "previews");
const SECTIONS = ["components", "foundations", "fragment-components", "patterns", "api"];
const LANGS = ["en", "zh"];
const LOCALIZED_FRONTMATTER_KEYS = new Set(["title", "description"]);
const REGISTRY_OWNED_FRONTMATTER_KEYS = [
  "status",
  "maturity",
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
  maturity: new Set(["experimental", "beta", "stable", "canonical"]),
  layer: new Set(["foundation", "primitive", "composition", "pattern", "registry", "api", "guide"]),
  package: new Set(["@nebutra/ui", "@nebutra/tokens"]),
  substrate: new Set(["native", "custom", "mixed"]),
};

const criticalComponentDocTemplateSlugs = [
  "button",
  "checkbox",
  "command-menu",
  "dialog",
  "dropdown-menu",
  "input",
  "menu",
  "popover",
  "radio-group",
  "select",
  "tabs",
  "textarea",
  "tooltip",
];

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

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
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

function stripFrontmatter(source) {
  return source.replace(/^---\n[\s\S]*?\n---\n?/, "");
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

function collectPreviewFiles() {
  if (!fs.existsSync(PREVIEWS_DIR)) return [];
  return fs
    .readdirSync(PREVIEWS_DIR)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => path.join(PREVIEWS_DIR, file))
    .sort();
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
  if (orphaned.length > 0) {
    fail(`generated previews need an MDX link or deletion: ${orphaned.join(", ")}`);
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

function assertRegistryMaturityContracts() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const allowedMaturityByStatus = {
    stable: new Set(["stable", "canonical"]),
    beta: new Set(["beta"]),
    experimental: new Set(["experimental"]),
    deprecated: new Set(["experimental"]),
  };

  for (const item of registry.items) {
    const status = item.meta?.docs?.status;
    const maturity = item.meta?.docs?.maturity;
    if (!status || !maturity) continue;

    const allowed = allowedMaturityByStatus[status];
    if (allowed?.has(maturity)) continue;

    fail(
      `registry item "${item.name}" has inconsistent docs maturity: status=${status}, maturity=${maturity}.`,
    );
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
    "maturity",
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

function assertCriticalComponentExamplesAndAntiPatterns() {
  const requiredHeadings = {
    en: [
      { label: "Real Product Examples", pattern: /^##\s+Real Product Examples\b/m },
      { label: "Anti-patterns", pattern: /^##\s+Anti-patterns\b/m },
    ],
    zh: [
      { label: "真实产品示例", pattern: /^##\s+真实产品示例\s*$/m },
      { label: "反模式", pattern: /^##\s+反模式\s*$/m },
    ],
  };

  for (const slug of criticalComponentDocTemplateSlugs) {
    for (const lang of LANGS) {
      const file = path.join(DOCS_DIR, lang, "components", `${slug}.mdx`);
      if (!fs.existsSync(file)) {
        fail(`${lang}/components/${slug}.mdx is required for critical primitive governance.`);
        continue;
      }

      const source = fs.readFileSync(file, "utf8");
      for (const heading of requiredHeadings[lang]) {
        if (hasHeading(source, heading.pattern)) continue;
        fail(
          `${relative(file)} is missing "${heading.label}". Critical component docs must document real usage and anti-patterns.`,
        );
      }
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

function assertNoPreviewEscapeHatchCopy() {
  const bannedPreviewGovernanceCopy = [
    ["demo-only preview exception", /\bdemo-only\b/i],
    ["fixture metadata exception", /\bfixture metadata\b/i],
    ["owner/type/reason exception", /owner\/type\/reason/i],
    ["generic preview allowlist", /\bgeneric allowlist\b/i],
    ["previewless exception", /\bpreviewless\b/i],
  ];

  for (const file of collectMdxFiles(path.join(DOCS_DIR))) {
    const body = stripInlineCode(stripCodeBlocks(stripFrontmatter(fs.readFileSync(file, "utf8"))));
    for (const [label, pattern] of bannedPreviewGovernanceCopy) {
      if (!pattern.test(body)) continue;
      fail(
        `${relative(file)} contains stale preview governance copy (${label}); every generated preview must be linked from MDX or deleted.`,
      );
    }
  }
}

function assertPreviewFixturesAreRealExamples() {
  const placeholderFixtureCopy = /\b(Lorem ipsum|Mock import|Adjust if necessary)\b/i;

  for (const file of collectPreviewFiles()) {
    const source = fs.readFileSync(file, "utf8");
    if (!placeholderFixtureCopy.test(source)) continue;
    fail(
      `${relative(file)} contains placeholder fixture copy; previews must use realistic product examples.`,
    );
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
  ["演示 (Demo)", /(^|[^\p{L}\p{N}_-])演示\s+\(Demo\)/mu],
  ["属性 (Props)", /(^|[^\p{L}\p{N}_-])属性\s+\(Props\)/mu],
  ["属性 (Prop)", /(^|[^\p{L}\p{N}_-])属性\s+\(Prop\)/mu],
  ["默认值 (Default)", /(^|[^\p{L}\p{N}_-])默认值\s+\(Default\)/mu],
  ["描述 (Description)", /(^|[^\p{L}\p{N}_-])描述\s+\(Description\)/mu],
  ["可访问性 (Accessibility)", /(^|[^\p{L}\p{N}_-])可访问性\s+\(Accessibility\)/mu],
  ["无障碍支持 (Accessibility)", /(^|[^\p{L}\p{N}_-])无障碍支持\s+\(Accessibility\)/mu],
  ["设计契约 (Design Contract)", /(^|[^\p{L}\p{N}_-])设计契约\s+\(Design Contract\)/mu],
];

function isAllowedZhEnglishHeading(heading, file) {
  const exactAllowed = new Set(["API", "Tokens", "Storybook / Registry"]);
  if (exactAllowed.has(heading)) return true;
  if (heading.startsWith("`")) return true;

  const docsRelativePath = relative(file);
  const isComponentContract =
    docsRelativePath.includes("/components/") || docsRelativePath.includes("/fragment-components/");

  if (!isComponentContract) return false;

  return (
    /^use[A-Z][A-Za-z0-9]*$/.test(heading) ||
    /^[A-Z][A-Za-z0-9]*(?:Props|Payload|Config|Ref|Hook)?$/.test(heading) ||
    /^[A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]+)+(?:\s*\/\s*[A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]+)*)*$/.test(
      heading,
    ) ||
    /^[A-Z][A-Za-z0-9]+\s*\/\s*[A-Z][A-Za-z0-9]+$/.test(heading)
  );
}

function zhLocalizationIssues(source, file) {
  const prose = stripCodeBlocks(stripFrontmatter(source));
  const body = stripInlineCode(prose);
  const issues = [];
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
  const description = frontmatter?.[1]?.match(/^description:\s*["']?(.+?)["']?$/m)?.[1]?.trim();
  const englishHeading =
    /^#{2,4}[ \t]+(Demo|Overview|Installation|Usage|Props|Best Practices|Accessibility|Design Contract|Examples|States|Presets|Token Families|When To Use|When to use)\b/gm;
  const headingPattern = /^#{2,4}[ \t]+(.+)$/gm;
  const englishPropsTable =
    /^\|\s*Prop\s*\|\s*Type\s*\|\s*(Default|默认值)\s*\|\s*(Description|说明)\s*\|/gm;
  const englishDoDontLabel = /\*\*(?:Do|Don't)\*\*/g;
  const englishParentheticalHeading = /^#{2,4}[ \t]+.+[\u4e00-\u9fff].*\([A-Za-z][^)]+\)/gm;
  const placeholderCopy = /\b(TODO|TBD|Placeholder|Lorem ipsum)\b/g;

  if (description && /[A-Za-z]/.test(description) && !/[\u4e00-\u9fff]/.test(description)) {
    issues.push("English-only frontmatter description");
  }
  for (const match of prose.matchAll(englishHeading)) {
    issues.push(`English template heading "${match[1]}"`);
  }
  for (const match of prose.matchAll(headingPattern)) {
    const heading = match[1].trim();
    if (/[\u4e00-\u9fff]/.test(heading)) continue;
    if (isAllowedZhEnglishHeading(heading, file)) continue;
    issues.push(`English-only heading "${heading}"`);
  }
  for (const [label, pattern] of zhTemplateParentheticalSuffixes) {
    if (pattern.test(body)) {
      issues.push(`English template suffix "${label}"`);
    }
  }
  if (englishPropsTable.test(body)) {
    issues.push("English props table header");
  }
  if (englishDoDontLabel.test(body)) {
    issues.push("English do/don't label");
  }
  for (const match of prose.matchAll(englishParentheticalHeading)) {
    issues.push(`English parenthetical heading "${match[0].replace(/^#{2,4}[ \t]+/, "")}"`);
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
    const issues = zhLocalizationIssues(source, file);
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
assertRegistryMaturityContracts();
assertStructuredFrontmatterContracts();
assertRegistryDocTemplateContracts();
assertCriticalComponentExamplesAndAntiPatterns();
assertNoStaleSubstrateCopy();
assertBrandTokenTruth();
assertNoPreviewEscapeHatchCopy();
assertPreviewFixturesAreRealExamples();
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
