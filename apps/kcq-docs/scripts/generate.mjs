#!/usr/bin/env node
/**
 * Generates everything the docs read from the pinned chart source: design tokens, facts, the
 * wordmark outline, fonts, imported source documents and the generated reference pages.
 * Hand-written pages live in content/docs/{en,zh}; generated files are listed in
 * .generated/manifest.json and gitignored (see .gitignore), and stale ones are removed each run.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { THEME_INIT_SCRIPT } from "../../kcq/scripts/landing-plugin.mjs";
import { copyFonts, tokensCss, wordmark } from "./lib/brand.mjs";
import { readReactComponent, readVueComponent, readWebComponent } from "./lib/components.mjs";
import { importDocs } from "./lib/import-docs.mjs";
import {
  changelogPages,
  componentPages,
  httpApiPages,
  liveBarsPages,
  packagePages,
  readLiveContract,
  toolPages,
} from "./lib/pages.mjs";
import { APP_ROOT, chartSource, githubLinks, KCQ_APP_ROOT, readPin } from "./lib/source.mjs";
import { readAgentTools } from "./lib/tools.mjs";

const FOLDERS = {
  "architecture/adr": { en: "Decisions (ADR)", zh: "架构决策（ADR）" },
  "architecture/notes": { en: "Design notes", zh: "设计笔记" },
  "architecture/engineering": { en: "Engineering notes", zh: "工程笔记" },
  "market-data/sources": { en: "More data sources", zh: "更多数据源" },
};
const REFERENCE_ORDER = ["vue", "react", "web-component", "packages"];

const started = Date.now();
const pin = readPin();
const source = chartSource();
const links = githubLinks(pin);
const written = new Set();

function write(path, content) {
  const target = resolve(APP_ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target) || readFileSync(target, "utf8") !== content)
    writeFileSync(target, content);
  written.add(relative(APP_ROOT, target));
}

// 1. Brand: tokens, wordmark, fonts.
write("src/generated/tokens.css", tokensCss(source));
const mark = wordmark();
write("src/generated/wordmark.json", `${JSON.stringify(mark)}\n`);
// The wordmark as one cached file, drawn through a CSS mask in currentColor (src/components/brand-mark.tsx),
// so its 6 KB outline is not inlined into every page's HTML and RSC payload.
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}"><path d="${mark.d}"/></svg>\n`;
const wordmarkName = `wordmark.${createHash("sha256").update(wordmarkSvg).digest("hex").slice(0, 10)}.svg`;
write(`public/docs/brand/${wordmarkName}`, wordmarkSvg);
write(
  "src/generated/brand.json",
  `${JSON.stringify({ wordmark: `/docs/brand/${wordmarkName}`, width: mark.width, height: mark.height, glyph: mark.glyph })}\n`,
);
const fonts = copyFonts(resolve(APP_ROOT, "public/docs/fonts"));
write("src/generated/fonts.css", fonts.css);
write("src/generated/fonts.json", `${JSON.stringify({ preload: fonts.preload })}\n`);

// The public pages' blocking theme script, byte for byte: the site CSP admits exactly its hash
// (infra/fly/kcq.security-headers.conf), and the docs share its storage key and resolution.
write("src/generated/theme-init.json", `${JSON.stringify({ script: THEME_INIT_SCRIPT })}\n`);

// 2. Pages.
const tools = readAgentTools(source);
const vue = readVueComponent(source);
const react = readReactComponent(source);
const wc = readWebComponent(source);
const descriptions = JSON.parse(
  readFileSync(resolve(APP_ROOT, "scripts/data/component-descriptions.json"), "utf8"),
);
const components = componentPages(vue, react, wc, { links, descriptions });
const pages = [
  ...importDocs(source, links, pin),
  ...toolPages(tools, { source, links, pin }),
  ...components.pages,
  ...packagePages(source, { links }),
  ...liveBarsPages(readLiveContract(source), { links }),
  ...(await httpApiPages(source, { links })),
  ...changelogPages(source, { links }),
];

for (const [folder, titles] of Object.entries(FOLDERS)) {
  for (const lang of ["en", "zh"]) {
    pages.push({
      lang,
      slug: `${folder}/meta`,
      format: "json",
      content: `${JSON.stringify({ title: titles[lang], defaultOpen: false }, null, 2)}\n`,
    });
  }
}
for (const lang of ["en", "zh"]) {
  pages.push({
    lang,
    slug: "reference/meta",
    format: "json",
    content: `${JSON.stringify({ title: lang === "en" ? "Reference" : "参考", pages: REFERENCE_ORDER }, null, 2)}\n`,
  });
}

const seen = new Set();
for (const page of pages) {
  const path = `content/docs/${page.lang}/${page.slug}.${page.format}`;
  if (seen.has(path)) throw new Error(`Two generators wrote ${path}`);
  if (/\./.test(page.slug))
    throw new Error(`Slug ${page.slug} contains a dot; nginx serves dotted paths as files`);
  seen.add(path);
  write(path, page.content);
}

// The catalog as data: what the model receives, for agents and the reference's schema disclosures.
write(
  "public/docs/agent-tools.json",
  `${JSON.stringify(
    {
      commit: pin.commit,
      source: links.blob("packages/core/src/foundation/agent/chartToolRegistry.ts"),
      tools: tools.map(
        ({
          name,
          label,
          description,
          safety,
          executionMode,
          origin,
          parameters,
          source: file,
          line,
        }) => ({
          name,
          label,
          description,
          safety,
          executionMode,
          origin,
          source: `${links.blob(file)}#L${line}`,
          parameters,
        }),
      ),
    },
    null,
    2,
  )}\n`,
);

// 3. Facts for the shell (header, footer, edit links, llms.txt).
const activity = JSON.parse(
  readFileSync(resolve(KCQ_APP_ROOT, "src/public/home/community/activity.json"), "utf8"),
);
const corePackage = JSON.parse(readFileSync(resolve(source, "packages/core/package.json"), "utf8"));
write(
  "src/generated/facts.json",
  `${JSON.stringify(
    {
      commit: pin.commit,
      repository: links.repository,
      upstream: links.upstream,
      version: corePackage.version,
      stars: activity.stars,
      starsFetchedAt: activity.fetchedAt.slice(0, 10),
      tools: {
        count: tools.length,
        readOnly: tools.filter((t) => t.safety === "read-only").length,
      },
    },
    null,
    2,
  )}\n`,
);

// 4. Remove files a previous run generated and this one did not.
const manifestPath = resolve(APP_ROOT, ".generated/manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : [];
for (const file of previous) {
  if (!written.has(file)) rmSync(resolve(APP_ROOT, file), { force: true });
}
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify([...written].sort(), null, 2)}\n`);

if (components.missing.length) {
  console.warn(
    `generate: no English description for ${components.missing.join(", ")}; the source comment is shown. Add them to scripts/data/component-descriptions.json.`,
  );
}
// biome-ignore lint/suspicious/noConsole: build script — stdout is the report.
console.log(
  `generate: ${pages.length} generated pages, ${tools.length} agent tools from ${pin.commit.slice(0, 7)} in ${Date.now() - started}ms`,
);
