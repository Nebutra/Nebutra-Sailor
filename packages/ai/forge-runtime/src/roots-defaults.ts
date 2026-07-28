/**
 * W1 demand-root tags for tools that predate explicit `roots[]` on definitions.
 * Explicit tool.roots always wins. Category fallback is last resort.
 *
 * Roots align with docs §6.7 (generator, converter, formatter, calculator,
 * checker, optimizer, viewer, extractor, analyzer, comparator, simulator).
 */
export const SLUG_ROOTS: Readonly<Record<string, readonly string[]>> = {
  // text
  "word-count": ["analyzer", "calculator"],
  "case-convert": ["converter", "formatter"],
  "remove-blank-lines": ["optimizer", "formatter"],
  "text-diff": ["comparator", "analyzer"],
  "zh-cn-tw": ["converter"],
  pinyin: ["converter", "generator"],
  "sort-lines": ["formatter", "optimizer"],
  "reverse-text": ["converter"],
  "unique-lines": ["optimizer"],
  "strip-html": ["extractor", "converter"],
  slugify: ["generator", "converter"],
  "extract-urls": ["extractor"],
  "extract-emails": ["extractor"],
  "camel-snake": ["converter", "formatter"],
  "json-to-ts": ["generator", "converter"],
  "trim-whitespace": ["optimizer", "formatter"],
  "text-replace": ["editor", "converter"],
  "line-prefix-suffix": ["formatter", "converter"],
  "fullwidth-halfwidth": ["converter"],
  // codec
  base64: ["converter"],
  "url-encode": ["converter"],
  "html-entities": ["converter"],
  "jwt-decode": ["viewer", "extractor"],
  unicode: ["converter", "viewer"],
  "query-string": ["converter", "viewer"],
  "image-base64": ["converter"],
  hex: ["converter"],
  // data
  "json-format": ["formatter", "optimizer"],
  "json-yaml": ["converter"],
  "json-toml": ["converter"],
  "json-csv": ["converter"],
  "csv-preview": ["viewer"],
  "xml-format": ["formatter"],
  "json-path": ["extractor", "viewer"],
  // hash / security
  md5: ["generator", "checker"],
  sha1: ["generator", "checker"],
  sha256: ["generator", "checker"],
  sha512: ["generator", "checker"],
  hmac: ["generator"],
  "file-checksum": ["generator", "checker"],
  "password-generate": ["generator"],
  "password-strength": ["checker", "analyzer"],
  // dev
  uuid: ["generator"],
  nanoid: ["generator"],
  "number-base": ["converter", "calculator"],
  "regex-tester": ["checker", "analyzer"],
  "color-convert": ["converter"],
  "sql-format": ["formatter"],
  "markdown-preview": ["viewer"],
  "md-to-html": ["converter"],
  // time
  "unix-timestamp": ["converter", "calculator"],
  "cron-explain": ["viewer", "simulator", "analyzer"],
  timezone: ["converter", "calculator"],
  lunar: ["converter", "calculator"],
  "date-diff": ["calculator"],
  // life / unit / cn
  bmi: ["calculator"],
  percentage: ["calculator"],
  "data-size": ["converter", "calculator"],
  "rmb-uppercase": ["converter", "generator"],
  mortgage: ["calculator"],
  kinship: ["calculator"],
  length: ["converter", "calculator"],
  weight: ["converter", "calculator"],
  temperature: ["converter", "calculator"],
  area: ["converter", "calculator"],
  speed: ["converter", "calculator"],
  volume: ["converter", "calculator"],
  "id-card": ["checker", "verifier"],
  "phone-lookup": ["checker", "viewer"],
  // image / doc / llm
  "qr-generate": ["generator"],
  "qr-decode": ["extractor", "viewer"],
  "image-compress": ["optimizer"],
  "image-resize": ["converter", "optimizer"],
  "image-convert": ["converter"],
  "pdf-merge": ["converter", "optimizer"],
  "pdf-split": ["converter", "extractor"],
  "token-count": ["calculator", "analyzer"],
  "cost-estimate": ["calculator"],
  "json-schema-validate": ["checker"],
};

const CATEGORY_ROOTS: Readonly<Record<string, readonly string[]>> = {
  text: ["converter"],
  codec: ["converter"],
  data: ["converter"],
  hash: ["generator"],
  security: ["generator"],
  dev: ["converter"],
  time: ["calculator"],
  life: ["calculator"],
  unit: ["converter", "calculator"],
  cn: ["checker"],
  image: ["converter"],
  doc: ["converter"],
  llm: ["calculator"],
};

/**
 * Resolve demand roots for a tool. Prefers explicit definition, then slug map,
 * then category fallback.
 */
export function resolveToolRoots(tool: {
  slug: string;
  category: string;
  roots?: readonly string[];
}): readonly string[] {
  if (tool.roots && tool.roots.length > 0) return tool.roots;
  if (SLUG_ROOTS[tool.slug]) return SLUG_ROOTS[tool.slug]!;
  return CATEGORY_ROOTS[tool.category] ?? ["converter"];
}
