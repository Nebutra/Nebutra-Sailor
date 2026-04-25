import path from "node:path";
import { readFiles, scanURLs, validateFiles } from "next-validate-link";

const cwd = process.cwd();
const supportedLanguages = ["en", "zh"];

const files = await readFiles("content/docs/**/*.{md,mdx}", {
  pathToUrl,
});

const docsRoutes = new Map();
for (const file of files) {
  const route = pathToUrl(file.path);
  if (!route) {
    continue;
  }

  docsRoutes.set(route, toPopulateValue(route));

  const segments = route.replace(/^\/[^/]+\/docs\/?/, "").split("/").filter(Boolean);
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

const invalidFiles = results.filter((result) => result.errors.length > 0);
const invalidLinks = invalidFiles.reduce((total, result) => total + result.errors.length, 0);

if (invalidLinks === 0) {
  console.log(`design-docs link lint passed (${files.length} files scanned).`);
  process.exit(0);
}

console.warn(
  `::warning::design-docs link lint found ${invalidLinks} invalid local links in ${invalidFiles.length} files; keeping advisory to avoid CI noise from existing docs debt.`,
);

for (const result of invalidFiles.slice(0, 20)) {
  for (const error of result.errors.slice(0, 5)) {
    const reason = error.reason instanceof Error ? error.reason.message : error.reason;
    console.warn(`${result.file}:${error.line}:${error.column} ${error.url} (${reason})`);
  }
}

if (invalidFiles.length > 20) {
  console.warn(`... ${invalidFiles.length - 20} more files omitted.`);
}

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
