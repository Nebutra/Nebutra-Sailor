import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// gray-matter@4 still expects js-yaml@3 `safeLoad`/`safeDump`. Root pnpm
// overrides pin js-yaml>=4.3, which drops those aliases — patch the shared
// CJS export before next-validate-link pulls gray-matter in.
const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
if (typeof yaml.safeLoad !== "function" && typeof yaml.load === "function") {
  yaml.safeLoad = yaml.load.bind(yaml);
}
if (typeof yaml.safeDump !== "function" && typeof yaml.dump === "function") {
  yaml.safeDump = yaml.dump.bind(yaml);
}

const { scanURLs, validateFiles } = await import("next-validate-link");

const cwd = path.resolve(import.meta.dirname, "..");
const supportedLanguages = ["en", "zh"];

process.chdir(cwd);

const files = await readDocsFiles(path.join(cwd, "content/docs"));

if (files.length === 0) {
  console.error("design-docs link lint found no docs files; check the docs root.");
  process.exit(1);
}

const docsRoutes = new Map();
for (const file of files) {
  const route = pathToUrl(file.path);
  if (!route) {
    continue;
  }

  docsRoutes.set(route, toPopulateValue(route));

  const segments = route
    .replace(/^\/[^/]+\/docs\/?/, "")
    .split("/")
    .filter(Boolean);
  const lang = route.split("/")[1];
  for (let index = 1; index < segments.length; index += 1) {
    const prefix = `/${lang}/docs/${segments.slice(0, index).join("/")}`;
    docsRoutes.set(prefix, toPopulateValue(prefix));
  }
}

const scanned = await scanURLs({
  preset: "next",
  cwd,
  populate: {
    "[lang]": supportedLanguages.map((lang) => ({ value: { lang } })),
    "[lang]/docs/[[...slug]]": [...docsRoutes.values()],
    "[lang]/remote/[[...slug]]": supportedLanguages.map((lang) => ({ value: { lang } })),
  },
});

for (const route of docsRoutes.keys()) {
  scanned.urls.set(route, {});
  if (route.startsWith("/en/docs")) {
    scanned.urls.set(route.replace(/^\/en\/docs/, "/design-system"), {});
  }
}

const knownDocsRoutes = new Set(scanned.urls.keys());

const results = await validateFiles(files, {
  scanned,
  markdown: {
    components: {
      Card: { attributes: ["href"] },
    },
  },
  checkRelativePaths: "as-url",
  whitelist: (url) =>
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#"),
});

const missingDocsRoutes = findMissingDocsRoutes(files, knownDocsRoutes);
const invalidFiles = results.filter((result) => result.errors.length > 0);
const invalidLinks =
  invalidFiles.reduce((total, result) => total + result.errors.length, 0) +
  missingDocsRoutes.length;

if (invalidLinks === 0) {
  // biome-ignore lint/suspicious/noConsole: CLI lint script — stdout is the expected output channel
  console.log(`design-docs link lint passed (${files.length} files scanned).`);
  process.exit(0);
}

console.error(
  `design-docs link lint found ${invalidLinks} invalid local links in ${invalidFiles.length} files.`,
);

for (const result of invalidFiles.slice(0, 20)) {
  for (const error of result.errors.slice(0, 5)) {
    const reason = error.reason instanceof Error ? error.reason.message : error.reason;
    console.error(`${result.file}:${error.line}:${error.column} ${error.url} (${reason})`);
  }
}

for (const error of missingDocsRoutes.slice(0, 50)) {
  console.error(`${error.file}:${error.line}:${error.column} ${error.url} (${error.reason})`);
}

if (invalidFiles.length > 20) {
  console.error(`... ${invalidFiles.length - 20} more files omitted.`);
}

if (missingDocsRoutes.length > 50) {
  console.error(`... ${missingDocsRoutes.length - 50} more strict docs-route errors omitted.`);
}

process.exit(1);

function pathToUrl(filePath) {
  const relativePath = path.relative(cwd, path.resolve(cwd, filePath)).split(path.sep).join("/");
  const match = /^content\/docs\/([^/]+)\/(.+)\.mdx?$/.exec(relativePath);
  if (!match) {
    return undefined;
  }

  const [, lang, slugPath] = match;
  const slug = slugPath.replace(/\/index$/, "").replace(/^index$/, "");
  return slug ? `/${lang}/docs/${slug}` : `/${lang}/docs`;
}

function toPopulateValue(route) {
  const [, lang, , ...slug] = route.split("/");
  return slug.length > 0 ? { value: { lang, slug } } : { value: { lang } };
}

function findMissingDocsRoutes(filesToCheck, knownRoutes) {
  const errors = [];
  const seen = new Set();
  const docsLinkPattern =
    /(?:\]\(|\bhref=["'])(\/(?:en|zh)\/docs(?:\/[^)"'\s#?]*)?|\/design-system(?:\/[^)"'\s#?]*)?)(?:[#?][^)"']*)?/g;

  for (const file of filesToCheck) {
    for (const match of file.content.matchAll(docsLinkPattern)) {
      const url = normalizeDocsUrl(match[1]);
      if (knownRoutes.has(url)) {
        continue;
      }

      const key = `${file.path}:${match.index}:${url}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const { line, column } = getLineColumn(file.content, match.index ?? 0);
      errors.push({
        file: file.path,
        line,
        column,
        url,
        reason: "docs route is not backed by a source MDX file",
      });
    }
  }

  return errors;
}

function normalizeDocsUrl(url) {
  const withoutHashOrQuery = url.split(/[?#]/, 1)[0].replace(/\/$/, "");
  if (withoutHashOrQuery === "/design-system") {
    return "/en/docs";
  }

  return withoutHashOrQuery.replace(/^\/design-system(?=\/|$)/, "/en/docs") || "/";
}

function getLineColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

async function readDocsFiles(rootDir) {
  const paths = await collectMarkdownFiles(rootDir);

  return Promise.all(
    paths.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");
      const stripped = stripFrontmatter(content);
      const relativePath = path.relative(cwd, filePath).split(path.sep).join("/");

      return {
        path: relativePath,
        data: {},
        content: stripped,
        url: pathToUrl(relativePath),
      };
    }),
  );
}

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(fullPath);
      }

      return /\.(?:md|mdx)$/.test(entry.name) ? [fullPath] : [];
    }),
  );

  return files.flat().sort();
}

function stripFrontmatter(source) {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return source;
  }

  const newline = source.startsWith("---\r\n") ? "\r\n" : "\n";
  const marker = `${newline}---${newline}`;
  const endIndex = source.indexOf(marker, 3);
  if (endIndex === -1) {
    return source;
  }

  const frontmatter = source.slice(0, endIndex + marker.length);
  return "\n".repeat(countLines(frontmatter)) + source.slice(endIndex + marker.length);
}

function countLines(source) {
  let lines = 0;
  for (const char of source) {
    if (char === "\n") {
      lines += 1;
    }
  }

  return lines;
}
