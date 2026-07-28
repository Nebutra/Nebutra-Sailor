"use client";

import { DEFAULT_PUBLIC_MODEL, frontierSelectOptions } from "@nebutra/ai-providers/frontier";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type FieldDef, GenericInvokeRunner } from "@/components/generic-invoke-runner";

const TEXT_FIELD = (sample = "Hello Nebutra 你好世界", label = "Text"): FieldDef => ({
  key: "text",
  label,
  kind: "textarea",
  defaultValue: sample,
  rows: 8,
});

function g(
  toolId: string,
  fields: readonly FieldDef[],
  note?: string,
  formatOutput?: (o: Record<string, unknown>) => string,
) {
  return (
    <GenericInvokeRunner
      toolId={toolId}
      fields={fields}
      {...(note !== undefined ? { note } : {})}
      {...(formatOutput !== undefined ? { formatOutput } : {})}
    />
  );
}

const pick =
  (...keys: string[]) =>
  (o: Record<string, unknown>) => {
    for (const k of keys) {
      if (typeof o[k] === "string") return String(o[k]);
      if (typeof o[k] === "number") return String(o[k]);
    }
    return JSON.stringify(o, null, 2);
  };

/**
 * Catalog fallback runner — uses next-intl for field labels.
 * Renders `fallback` when the slug has no catalog form.
 */
export function CatalogRunnerRouter({
  slug,
  toolId,
  fallback = null,
}: {
  slug: string;
  toolId: string;
  fallback?: ReactNode;
}): ReactNode {
  const t = useTranslations("runners");
  switch (slug) {
    case "zh-cn-tw":
      return g(
        toolId,
        [
          TEXT_FIELD("汉字与计算机，繁體測試"),
          {
            key: "mode",
            label: t("common.direction"),
            kind: "select",
            defaultValue: "s2t",
            options: [
              { value: "s2t", label: t("zhCnTw.s2t") },
              { value: "t2s", label: t("zhCnTw.t2s") },
              { value: "s2tw", label: t("zhCnTw.s2tw") },
              { value: "tw2s", label: t("zhCnTw.tw2s") },
              { value: "s2hk", label: t("zhCnTw.s2hk") },
              { value: "hk2s", label: t("zhCnTw.hk2s") },
            ],
          },
        ],
        "OpenCC (opencc-js)",
      );

    case "pinyin":
      return g(
        toolId,
        [
          TEXT_FIELD("你好，世界"),
          {
            key: "toneType",
            label: t("pinyin.tones"),
            kind: "select",
            defaultValue: "symbol",
            options: [
              { value: "symbol", label: t("pinyin.symbol") },
              { value: "num", label: t("pinyin.num") },
              { value: "none", label: t("pinyin.none") },
            ],
          },
        ],
        "pinyin-pro",
      );

    case "unicode":
      return g(toolId, [
        TEXT_FIELD("Hello 你好"),
        {
          key: "mode",
          label: t("common.mode"),
          kind: "select",
          defaultValue: "to_escape",
          options: [
            { value: "to_escape", label: "→ \\u escape" },
            { value: "from_escape", label: "← unescape" },
            { value: "code_points", label: "Code points" },
          ],
        },
      ]);

    case "query-string":
      return g(
        toolId,
        [
          TEXT_FIELD("https://example.com?a=1&b=hello&b=world"),
          {
            key: "mode",
            label: t("common.mode"),
            kind: "select",
            defaultValue: "parse",
            options: [
              { value: "parse", label: "Parse" },
              { value: "stringify", label: "Stringify JSON object" },
            ],
          },
        ],
        undefined,
        pick("json", "result"),
      );

    case "json-yaml":
      return g(
        toolId,
        [
          TEXT_FIELD('{"name":"Nebutra","tags":["forge","tools"]}'),
          {
            key: "mode",
            label: t("common.direction"),
            kind: "select",
            defaultValue: "json_to_yaml",
            options: [
              { value: "json_to_yaml", label: "JSON → YAML" },
              { value: "yaml_to_json", label: "YAML → JSON" },
            ],
          },
        ],
        "js-yaml",
      );

    case "json-toml":
      return g(
        toolId,
        [
          TEXT_FIELD('{"name":"Nebutra","port":3105}'),
          {
            key: "mode",
            label: t("common.direction"),
            kind: "select",
            defaultValue: "json_to_toml",
            options: [
              { value: "json_to_toml", label: "JSON → TOML" },
              { value: "toml_to_json", label: "TOML → JSON" },
            ],
          },
        ],
        "smol-toml",
      );

    case "json-csv":
      return g(
        toolId,
        [
          TEXT_FIELD('[{"id":1,"name":"a"},{"id":2,"name":"b"}]'),
          {
            key: "mode",
            label: t("common.direction"),
            kind: "select",
            defaultValue: "json_to_csv",
            options: [
              { value: "json_to_csv", label: "JSON → CSV" },
              { value: "csv_to_json", label: "CSV → JSON" },
            ],
          },
        ],
        "Papa Parse",
      );

    case "csv-preview":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "CSV",
            kind: "textarea",
            defaultValue: "name,age\nAda,30\nBob,28",
            rows: 8,
          },
          { key: "maxRows", label: t("csvPreview.preview"), kind: "number", defaultValue: "50" },
        ],
        "Papa Parse",
      );

    case "xml-format":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "XML",
            kind: "textarea",
            defaultValue: '<root><item id="1">hi</item></root>',
            rows: 8,
          },
          {
            key: "mode",
            label: t("common.mode"),
            kind: "select",
            defaultValue: "format",
            options: [
              { value: "format", label: t("xmlFormat.pretty") },
              { value: "minify", label: t("xmlFormat.minify") },
              { value: "validate", label: t("xmlFormat.validate") },
            ],
          },
        ],
        "fast-xml-parser",
      );

    case "json-path":
      return g(
        toolId,
        [
          TEXT_FIELD('{"store":{"book":[{"title":"A"},{"title":"B"}]}}'),
          {
            key: "path",
            label: "JSONPath",
            kind: "text",
            defaultValue: "$.store.book[*].title",
          },
        ],
        "jsonpath-plus",
      );

    case "regex-tester":
      return g(
        toolId,
        [
          { key: "pattern", label: t("regexLegacy.pattern"), kind: "text", defaultValue: "\\w+" },
          { key: "flags", label: t("regexLegacy.flags"), kind: "text", defaultValue: "g" },
          TEXT_FIELD("Hello Nebutra 123"),
          {
            key: "mode",
            label: t("common.mode"),
            kind: "select",
            defaultValue: "match",
            options: [
              { value: "match", label: t("regexLegacy.match") },
              { value: "replace", label: t("regexLegacy.replace") },
              { value: "test", label: "test" },
            ],
          },
          {
            key: "replacement",
            label: t("regexLegacy.replacement"),
            kind: "text",
            defaultValue: "",
          },
        ],
        "RegExp + 超时预算",
      );

    case "color-convert":
      return g(
        toolId,
        [{ key: "color", label: t("colorConvert.color"), kind: "text", defaultValue: "#0033FE" }],
        "culori",
      );

    case "sql-format":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "SQL",
            kind: "textarea",
            defaultValue: "select id,name from users where active=1 order by id",
            rows: 8,
          },
          {
            key: "language",
            label: t("sqlFormat.dialect"),
            kind: "select",
            defaultValue: "sql",
            options: [
              { value: "sql", label: "SQL" },
              { value: "mysql", label: "MySQL" },
              { value: "postgresql", label: "PostgreSQL" },
              { value: "sqlite", label: "SQLite" },
              { value: "tsql", label: "T-SQL" },
              { value: "bigquery", label: "BigQuery" },
            ],
          },
        ],
        "sql-formatter",
      );

    case "nanoid":
      return g(
        toolId,
        [
          { key: "size", label: "Length", kind: "number", defaultValue: "21" },
          { key: "count", label: "Count", kind: "number", defaultValue: "5" },
        ],
        "nanoid",
      );

    case "markdown-preview":
    case "md-to-html":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "Markdown",
            kind: "textarea",
            defaultValue: "# Hello\n\n**Nebutra** Forge\n\n- a\n- b",
            rows: 10,
          },
        ],
        "marked",
        pick("html"),
      );

    case "cron-explain":
      return g(
        toolId,
        [
          { key: "expression", label: "Cron", kind: "text", defaultValue: "0 9 * * 1-5" },
          { key: "count", label: t("cron.parse"), kind: "number", defaultValue: "5" },
          { key: "tz", label: t("cron.timezone"), kind: "text", defaultValue: "Asia/Shanghai" },
        ],
        "cron-parser",
      );

    case "timezone":
      return g(
        toolId,
        [
          {
            key: "datetime",
            label: t("timezone.datetime"),
            kind: "text",
            defaultValue: "2024-06-01 12:00:00",
          },
          { key: "fromTz", label: t("timezone.from"), kind: "text", defaultValue: "Asia/Shanghai" },
          { key: "toTz", label: t("timezone.to"), kind: "text", defaultValue: "America/New_York" },
        ],
        "dayjs + timezone",
      );

    case "lunar":
      return g(
        toolId,
        [
          {
            key: "mode",
            label: t("common.direction"),
            kind: "select",
            defaultValue: "solar_to_lunar",
            options: [
              { value: "solar_to_lunar", label: "Solar → Lunar" },
              { value: "lunar_to_solar", label: "Lunar → Solar" },
            ],
          },
          { key: "year", label: "Year", kind: "number", defaultValue: "2024" },
          { key: "month", label: "Month", kind: "number", defaultValue: "6" },
          { key: "day", label: "Day", kind: "number", defaultValue: "1" },
          { key: "isLeap", label: "Lunar leap month", kind: "boolean", defaultValue: false },
        ],
        "lunar-javascript",
      );

    case "sha512":
      return g(toolId, [TEXT_FIELD("hello")], "node:crypto", pick("hex"));

    case "hmac":
      return g(
        toolId,
        [
          TEXT_FIELD("payload"),
          { key: "secret", label: t("common.secret"), kind: "password", defaultValue: "secret" },
          {
            key: "algorithm",
            label: t("common.algorithm"),
            kind: "select",
            defaultValue: "sha256",
            options: [
              { value: "sha256", label: "SHA-256" },
              { value: "sha512", label: "SHA-512" },
              { value: "sha1", label: "SHA-1" },
            ],
          },
        ],
        "node:crypto HMAC",
        pick("digest"),
      );

    case "file-checksum":
      return g(
        toolId,
        [{ key: "fileBase64", label: t("common.file"), kind: "file-base64", accept: "*/*" }],
        "node:crypto",
      );

    case "password-strength":
      return g(
        toolId,
        [
          {
            key: "password",
            label: t("common.password"),
            kind: "password",
            defaultValue: "Nebutra!2024",
          },
        ],
        "zxcvbn-ts",
      );

    case "qr-generate":
      return g(
        toolId,
        [
          {
            key: "text",
            label: t("qrGen.content"),
            kind: "textarea",
            defaultValue: "https://nebutra.com",
            rows: 4,
          },
          {
            key: "format",
            label: t("qrGen.format"),
            kind: "select",
            defaultValue: "png",
            options: [
              { value: "png", label: "PNG" },
              { value: "svg", label: "SVG" },
              { value: "dataurl", label: "Data URL" },
            ],
          },
          { key: "width", label: "Width", kind: "number", defaultValue: "256" },
        ],
        "qrcode",
      );

    case "qr-decode":
      return g(
        toolId,
        [
          {
            key: "imageBase64",
            label: t("qrDecode.upload"),
            kind: "file-base64",
            accept: "image/*",
          },
        ],
        "jsQR + sharp",
        pick("text"),
      );

    case "image-base64":
      return g(toolId, [
        { key: "imageBase64", label: t("common.file"), kind: "file-base64", accept: "image/*" },
        {
          key: "mode",
          label: t("common.mode"),
          kind: "select",
          defaultValue: "inspect",
          options: [
            { value: "inspect", label: "Inspect" },
            { value: "to_data_url", label: "To Data URL" },
          ],
        },
      ]);

    case "cost-estimate":
      return g(
        toolId,
        [
          TEXT_FIELD("Explain quantum computing in simple terms."),
          {
            key: "model",
            label: t("costEstimate.model"),
            kind: "select",
            defaultValue: DEFAULT_PUBLIC_MODEL,
            options: [...frontierSelectOptions()],
          },
          {
            key: "outputTokens",
            label: t("costEstimate.outputTokens"),
            kind: "number",
            defaultValue: "500",
          },
        ],
        "模型目录 SSOT: @nebutra/ai-providers/frontier · js-tiktoken",
      );

    case "json-schema-validate":
      return g(
        toolId,
        [
          {
            key: "data",
            label: t("jsonSchema.data"),
            kind: "textarea",
            defaultValue: '{"name":"Ada","age":30}',
            rows: 6,
          },
          {
            key: "schema",
            label: "JSON Schema",
            kind: "textarea",
            defaultValue:
              '{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}},"required":["name"]}',
            rows: 8,
          },
        ],
        "Ajv",
      );

    case "length":
    case "weight":
    case "temperature":
    case "area":
    case "speed":
    case "volume":
      return unitRunner(toolId, slug);

    case "mortgage":
      return g(
        toolId,
        [
          { key: "principal", label: "Principal", kind: "number", defaultValue: "1000000" },
          { key: "annualRatePercent", label: "Annual rate %", kind: "number", defaultValue: "3.1" },
          { key: "years", label: "Years", kind: "number", defaultValue: "30" },
          {
            key: "method",
            label: t("common.mode"),
            kind: "select",
            defaultValue: "equal_installment",
            options: [
              { value: "equal_installment", label: "Equal installment" },
              { value: "equal_principal", label: "Equal principal" },
            ],
          },
        ],
        "标准摊还公式",
      );

    case "kinship":
      return g(toolId, [
        { key: "relation", label: "Relation", kind: "text", defaultValue: "爸爸的爸爸" },
      ]);

    case "id-card":
      return g(
        toolId,
        [{ key: "id", label: "ID number", kind: "text", defaultValue: "11010519491231002X" }],
        "GB 11643 校验位",
      );

    case "phone-lookup":
      return g(
        toolId,
        [{ key: "phone", label: "Phone", kind: "text", defaultValue: "13800138000" }],
        "号段粗分（非完整归属地库）",
      );

    case "pdf-merge":
      return g(
        toolId,
        [
          {
            key: "filesBase64",
            label: "Notes",
            kind: "textarea",
            defaultValue:
              "请用 API 传入 filesBase64 数组（多文件 UI 后续增强）。也可在 Playground 调用。",
            rows: 3,
          },
        ],
        "pdf-lib — 建议 API: POST filesBase64[]",
      );

    case "pdf-split":
      return g(
        toolId,
        [
          { key: "fileBase64", label: "PDF", kind: "file-base64", accept: "application/pdf" },
          { key: "fromPage", label: t("pdfSplit.fromPage"), kind: "number", defaultValue: "1" },
          { key: "toPage", label: t("pdfSplit.toPage"), kind: "number", defaultValue: "1" },
        ],
        "pdf-lib",
      );

    case "image-watermark":
      return g(
        toolId,
        [
          { key: "imageBase64", label: t("common.file"), kind: "file-base64", accept: "image/*" },
          { key: "text", label: "Watermark", kind: "text", defaultValue: "Nebutra" },
        ],
        "sharp",
      );

    case "trim-whitespace":
      return g(toolId, [TEXT_FIELD("  hello   world  \n\n  你好  ")], undefined, (o) =>
        typeof o.collapse === "string" ? o.collapse : JSON.stringify(o, null, 2),
      );

    case "text-replace":
      return g(toolId, [
        TEXT_FIELD("foo bar foo"),
        { key: "find", label: "Find", kind: "text", defaultValue: "foo" },
        { key: "replace", label: t("regexLegacy.replacement"), kind: "text", defaultValue: "baz" },
        { key: "regex", label: t("regexLegacy.pattern"), kind: "boolean", defaultValue: false },
      ]);

    case "line-prefix-suffix":
      return g(toolId, [
        TEXT_FIELD("apple\nbanana\ncherry"),
        { key: "prefix", label: "Prefix", kind: "text", defaultValue: "- " },
        { key: "suffix", label: "Suffix", kind: "text", defaultValue: "" },
      ]);

    case "fullwidth-halfwidth":
      return g(toolId, [
        TEXT_FIELD("Ｈｅｌｌｏ　世界！"),
        {
          key: "mode",
          label: t("common.direction"),
          kind: "select",
          defaultValue: "to_half",
          options: [
            { value: "to_half", label: "Fullwidth → Halfwidth" },
            { value: "to_full", label: "Halfwidth → Fullwidth" },
          ],
        },
      ]);

    // Wave-2 / W2b demand matrix — i18n-aware runners (§6.10 contract)
    case "lorem-ipsum":
      return <LoremIpsumCatalogRunner toolId={toolId} />;
    case "email-validate":
      return <EmailValidateCatalogRunner toolId={toolId} />;
    case "credit-card-luhn":
      return <CreditCardLuhnCatalogRunner toolId={toolId} />;
    case "json-minify":
      return <JsonMinifyCatalogRunner toolId={toolId} />;
    case "css-minify":
      return <CssMinifyCatalogRunner toolId={toolId} />;
    case "hash-compare":
      return <HashCompareCatalogRunner toolId={toolId} />;
    // json-diff uses specialized side-by-side runner in tool-workspace
    case "yaml-format":
      return <YamlFormatCatalogRunner toolId={toolId} />;
    case "toml-format":
      return <TomlFormatCatalogRunner toolId={toolId} />;
    case "xml-minify":
      return <XmlMinifyCatalogRunner toolId={toolId} />;
    case "url-validate":
      return <UrlValidateCatalogRunner toolId={toolId} />;
    case "ip-validate":
      return <IpValidateCatalogRunner toolId={toolId} />;
    case "uuid-validate":
      return <UuidValidateCatalogRunner toolId={toolId} />;
    case "html-minify":
      return <HtmlMinifyCatalogRunner toolId={toolId} />;
    case "random-string":
      return <RandomStringCatalogRunner toolId={toolId} />;
    case "reading-time":
      return <ReadingTimeCatalogRunner toolId={toolId} />;
    case "markdown-toc":
      return <MarkdownTocCatalogRunner toolId={toolId} />;
    case "pdf-info":
      return <PdfInfoCatalogRunner toolId={toolId} />;
    // W3 competitor staples
    case "rot13":
      return <Rot13CatalogRunner toolId={toolId} />;
    case "morse":
      return <MorseCatalogRunner toolId={toolId} />;
    case "text-binary":
      return <TextBinaryCatalogRunner toolId={toolId} />;
    case "base32":
      return <Base32CatalogRunner toolId={toolId} />;
    case "multi-hash":
      return <MultiHashCatalogRunner toolId={toolId} />;
    case "css-format":
      return <CssFormatCatalogRunner toolId={toolId} />;
    case "html-format":
      return <HtmlFormatCatalogRunner toolId={toolId} />;
    case "string-similarity":
      return <StringSimilarityCatalogRunner toolId={toolId} />;
    case "roman-numerals":
      return <RomanNumeralsCatalogRunner toolId={toolId} />;
    case "age-calculator":
      return <AgeCalculatorCatalogRunner toolId={toolId} />;
    case "tip-calculator":
      return <TipCalculatorCatalogRunner toolId={toolId} />;
    case "aspect-ratio":
      return <AspectRatioCatalogRunner toolId={toolId} />;
    case "mime-lookup":
      return <MimeLookupCatalogRunner toolId={toolId} />;
    case "user-agent-parse":
      return <UserAgentCatalogRunner toolId={toolId} />;
    case "image-meta":
      return <ImageMetaCatalogRunner toolId={toolId} />;
    case "word-frequency":
      return <WordFrequencyCatalogRunner toolId={toolId} />;
    case "json-xml":
      return <JsonXmlCatalogRunner toolId={toolId} />;
    case "sql-minify":
      return <SqlMinifyCatalogRunner toolId={toolId} />;
    case "line-numbers":
      return <LineNumbersCatalogRunner toolId={toolId} />;
    case "unique-words":
      return <UniqueWordsCatalogRunner toolId={toolId} />;
    case "epoch-convert":
      return <EpochConvertCatalogRunner toolId={toolId} />;
    case "password-entropy":
      return <PasswordEntropyCatalogRunner toolId={toolId} />;
    case "color-contrast":
      return <ColorContrastCatalogRunner toolId={toolId} />;
    case "exif-viewer":
      return <ExifViewerCatalogRunner toolId={toolId} />;
    case "remove-extra-spaces":
      return g(
        toolId,
        [TEXT_FIELD("hello   world\n\n  forge  ", "Text")],
        undefined,
        pick("result"),
      );
    case "find-replace-regex":
      return <FindReplaceRegexCatalogRunner toolId={toolId} />;
    case "count-chars":
      return g(toolId, [TEXT_FIELD("Hello 你好", "Text")], undefined, (o) =>
        JSON.stringify(o, null, 2),
      );
    case "csv-to-json-lite":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "CSV",
            kind: "textarea",
            defaultValue: "id,name\n1,Ada\n2,Lin",
            rows: 8,
          },
        ],
        undefined,
        pick("result"),
      );
    case "json-to-csv-lite":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "JSON",
            kind: "textarea",
            defaultValue: '[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]',
            rows: 8,
          },
        ],
        undefined,
        pick("result"),
      );
    case "jwt-generate":
      return <JwtGenerateCatalogRunner toolId={toolId} />;
    case "random-number":
      return <RandomNumberCatalogRunner toolId={toolId} />;
    case "dice-roll":
      return <DiceRollCatalogRunner toolId={toolId} />;
    case "hex-rgb":
      return <HexRgbCatalogRunner toolId={toolId} />;
    case "url-parse":
      return g(
        toolId,
        [TEXT_FIELD("https://user:pass@nebutra.com:443/path?q=1#hash", "URL")],
        undefined,
        (o) => JSON.stringify(o, null, 2),
      );
    case "base64url":
      return <Base64UrlCatalogRunner toolId={toolId} />;
    case "hmac-verify":
      return <HmacVerifyCatalogRunner toolId={toolId} />;
    case "secret-generate":
      return <SecretGenerateCatalogRunner toolId={toolId} />;
    case "checksum-text":
      return g(toolId, [TEXT_FIELD("nebutra", "Text")], undefined, (o) =>
        JSON.stringify(o, null, 2),
      );
    case "weekday":
      return g(
        toolId,
        [{ key: "date", label: "Date", kind: "text", defaultValue: "2026-07-28" }],
        undefined,
        (o) => JSON.stringify(o, null, 2),
      );
    case "percentage-change":
      return g(
        toolId,
        [
          { key: "from", label: "From", kind: "number", defaultValue: "100" },
          { key: "to", label: "To", kind: "number", defaultValue: "120" },
        ],
        undefined,
        (o) => JSON.stringify(o, null, 2),
      );
    case "lorem-words":
      return g(
        toolId,
        [{ key: "count", label: "Count", kind: "number", defaultValue: "40" }],
        undefined,
        pick("result"),
      );
    case "pdf-optimize":
      return <PdfOptimizeCatalogRunner toolId={toolId} />;
    // pdf-compress uses dedicated PdfCompressRunner in tool-workspace

    default:
      return fallback;
  }
}

/** Wave-2 runners use next-intl; tool title/SEO stay on registry LocalizedString. */
function LoremIpsumCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "paragraphs",
        label: t("lorem.paragraphs"),
        kind: "number",
        defaultValue: "3",
      },
      {
        key: "wordsPerParagraph",
        label: t("lorem.wordsPerParagraph"),
        kind: "number",
        defaultValue: "40",
      },
      {
        key: "startWithLorem",
        label: t("lorem.startWithLorem"),
        kind: "select",
        defaultValue: "true",
        options: [
          { value: "true", label: t("common.yes") },
          { value: "false", label: t("common.no") },
        ],
      },
    ],
    t("lorem.note"),
    (o) => String(o.text ?? JSON.stringify(o, null, 2)),
  );
}

function EmailValidateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [TEXT_FIELD("hello@nebutra.com\nnot-an-email\nsupport@example.org", t("common.text"))],
    t("emailValidate.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function CreditCardLuhnCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "number",
        label: t("creditCardLuhn.number"),
        kind: "text",
        defaultValue: "4111 1111 1111 1111",
      },
    ],
    t("creditCardLuhn.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function JsonMinifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("jsonMinify.json"),
        kind: "textarea",
        defaultValue: '{\n  "hello": "nebutra",\n  "ok": true\n}',
        rows: 10,
      },
    ],
    t("jsonMinify.note"),
    pick("result"),
  );
}

function CssMinifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("cssMinify.css"),
        kind: "textarea",
        defaultValue: "/* comment */\n.button {\n  color:  #0033FE;\n  margin:  0  auto;\n}",
        rows: 10,
      },
    ],
    t("cssMinify.note"),
    pick("result"),
  );
}

function HashCompareCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "a", label: t("hashCompare.a"), kind: "text", defaultValue: "abc123" },
      { key: "b", label: t("hashCompare.b"), kind: "text", defaultValue: "ABC123" },
      {
        key: "ignoreCase",
        label: t("hashCompare.ignoreCase"),
        kind: "select",
        defaultValue: "true",
        options: [
          { value: "true", label: t("common.yes") },
          { value: "false", label: t("common.no") },
        ],
      },
    ],
    t("hashCompare.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function YamlFormatCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("yamlFormat.yaml"),
        kind: "textarea",
        defaultValue: "name: Nebutra\ntools:\n  - forge\n  - router\nready: true\n",
        rows: 10,
      },
      {
        key: "mode",
        label: t("yamlFormat.mode"),
        kind: "select",
        defaultValue: "pretty",
        options: [
          { value: "pretty", label: t("yamlFormat.pretty") },
          { value: "compact", label: t("yamlFormat.compact") },
        ],
      },
      {
        key: "indent",
        label: t("yamlFormat.indent"),
        kind: "number",
        defaultValue: "2",
      },
    ],
    t("yamlFormat.note"),
    pick("result"),
  );
}

function TomlFormatCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("tomlFormat.toml"),
        kind: "textarea",
        defaultValue: 'title = "Forge"\nport = 3105\n',
        rows: 10,
      },
    ],
    t("tomlFormat.note"),
    pick("result"),
  );
}

function XmlMinifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("xmlMinify.xml"),
        kind: "textarea",
        defaultValue: '<?xml version="1.0"?>\n<root>\n  <item id="1">hello</item>\n</root>\n',
        rows: 10,
      },
    ],
    t("xmlMinify.note"),
    pick("result"),
  );
}

function UrlValidateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [TEXT_FIELD("https://nebutra.com/path?q=1\nftp://example.com\nnot-a-url", t("common.text"))],
    t("urlValidate.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function IpValidateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [TEXT_FIELD("127.0.0.1\n::1\n2001:db8::1\n999.1.1.1", t("common.text"))],
    t("ipValidate.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function UuidValidateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD(
        "550e8400-e29b-41d4-a716-446655440000\n00000000-0000-0000-0000-000000000000\nnot-a-uuid",
        t("common.text"),
      ),
    ],
    t("uuidValidate.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function HtmlMinifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("htmlMinify.html"),
        kind: "textarea",
        defaultValue: '<!-- note -->\n<div  class="box">\n  <p> Hello </p>\n</div>\n',
        rows: 10,
      },
    ],
    t("htmlMinify.note"),
    pick("result"),
  );
}

function RandomStringCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "length",
        label: t("randomString.length"),
        kind: "number",
        defaultValue: "16",
      },
      {
        key: "count",
        label: t("randomString.count"),
        kind: "number",
        defaultValue: "3",
      },
      {
        key: "charset",
        label: t("randomString.charset"),
        kind: "select",
        defaultValue: "alphanumeric",
        options: [
          { value: "alphanumeric", label: t("randomString.alphanumeric") },
          { value: "alphanumeric_symbols", label: t("randomString.symbols") },
          { value: "hex", label: t("randomString.hex") },
          { value: "base64url", label: t("randomString.base64url") },
        ],
      },
    ],
    t("randomString.note"),
    (o) => {
      const strings = o.strings;
      if (Array.isArray(strings)) return strings.map(String).join("\n");
      return JSON.stringify(o, null, 2);
    },
  );
}

function ReadingTimeCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD(
        "Nebutra Forge ships dual-surface tools for humans and agents.\n云毓智能工具站，所见即可调用。",
        t("common.text"),
      ),
    ],
    t("readingTime.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function MarkdownTocCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("markdownToc.markdown"),
        kind: "textarea",
        defaultValue: "# Intro\n\n## Install\n\n### pnpm\n\n## Usage\n\n## FAQ\n",
        rows: 12,
      },
      {
        key: "maxLevel",
        label: t("markdownToc.maxLevel"),
        kind: "number",
        defaultValue: "3",
      },
    ],
    t("markdownToc.note"),
    pick("toc"),
  );
}

function PdfInfoCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "fileBase64",
        label: t("pdfInfo.file"),
        kind: "file-base64",
        accept: "application/pdf,.pdf",
      },
    ],
    t("pdfInfo.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function Rot13CatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("Hello Nebutra", t("common.text")),
      { key: "shift", label: t("rot13.shift"), kind: "number", defaultValue: "13" },
    ],
    t("rot13.note"),
    pick("result"),
  );
}

function MorseCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("SOS HELP", t("common.text")),
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "encode",
        options: [
          { value: "encode", label: t("common.encode") },
          { value: "decode", label: t("common.decode") },
        ],
      },
    ],
    t("morse.note"),
    pick("result"),
  );
}

function TextBinaryCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("Hi", t("common.text")),
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "to_binary",
        options: [
          { value: "to_binary", label: t("textBinary.toBinary") },
          { value: "from_binary", label: t("textBinary.fromBinary") },
        ],
      },
    ],
    t("textBinary.note"),
    pick("result"),
  );
}

function Base32CatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("Nebutra", t("common.text")),
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "encode",
        options: [
          { value: "encode", label: t("common.encode") },
          { value: "decode", label: t("common.decode") },
        ],
      },
    ],
    t("base32.note"),
    pick("result"),
  );
}

function MultiHashCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("nebutra", t("common.text")),
      {
        key: "encoding",
        label: t("multiHash.encoding"),
        kind: "select",
        defaultValue: "hex",
        options: [
          { value: "hex", label: "hex" },
          { value: "base64", label: "base64" },
        ],
      },
    ],
    t("multiHash.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function CssFormatCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: "CSS",
        kind: "textarea",
        defaultValue: ".btn{color:#0033FE;margin:0 auto}",
        rows: 8,
      },
      { key: "indent", label: t("yamlFormat.indent"), kind: "number", defaultValue: "2" },
    ],
    t("cssFormat.note"),
    pick("result"),
  );
}

function HtmlFormatCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: "HTML",
        kind: "textarea",
        defaultValue: "<div><p>Hello</p><span>Forge</span></div>",
        rows: 8,
      },
      { key: "indent", label: t("yamlFormat.indent"), kind: "number", defaultValue: "2" },
    ],
    t("htmlFormat.note"),
    pick("result"),
  );
}

function StringSimilarityCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "a",
        label: t("stringSimilarity.a"),
        kind: "textarea",
        defaultValue: "kitten",
        rows: 3,
      },
      {
        key: "b",
        label: t("stringSimilarity.b"),
        kind: "textarea",
        defaultValue: "sitting",
        rows: 3,
      },
    ],
    t("stringSimilarity.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function RomanNumeralsCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "text", label: t("common.text"), kind: "text", defaultValue: "2026" },
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "to_roman",
        options: [
          { value: "to_roman", label: t("roman.toRoman") },
          { value: "from_roman", label: t("roman.fromRoman") },
        ],
      },
    ],
    t("roman.note"),
    pick("result"),
  );
}

function AgeCalculatorCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "birthDate",
        label: t("age.birthDate"),
        kind: "text",
        defaultValue: "2000-01-15",
      },
      {
        key: "asOf",
        label: t("age.asOf"),
        kind: "text",
        defaultValue: "",
        placeholder: "YYYY-MM-DD (optional)",
      },
    ],
    t("age.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function TipCalculatorCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "bill", label: t("tip.bill"), kind: "number", defaultValue: "100" },
      { key: "tipPercent", label: t("tip.percent"), kind: "number", defaultValue: "15" },
      { key: "people", label: t("tip.people"), kind: "number", defaultValue: "2" },
    ],
    t("tip.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function AspectRatioCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "width", label: t("aspect.width"), kind: "number", defaultValue: "1920" },
      { key: "height", label: t("aspect.height"), kind: "number", defaultValue: "1080" },
    ],
    t("aspect.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function MimeLookupCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [TEXT_FIELD("index.html\nphoto.png\narchive.zip\nunknown.zzz", t("common.text"))],
    t("mime.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function UserAgentCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: "User-Agent",
        kind: "textarea",
        defaultValue:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        rows: 4,
      },
    ],
    t("ua.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function ImageMetaCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "imageBase64",
        label: t("imageMeta.file"),
        kind: "file-base64",
        accept: "image/*",
      },
    ],
    t("imageMeta.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function WordFrequencyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("hello world hello forge 工具 工具 站", t("common.text")),
      { key: "top", label: t("wordFreq.top"), kind: "number", defaultValue: "20" },
    ],
    t("wordFreq.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function JsonXmlCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: t("common.text"),
        kind: "textarea",
        defaultValue: '{\n  "name": "Nebutra",\n  "ok": true\n}',
        rows: 10,
      },
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "json_to_xml",
        options: [
          { value: "json_to_xml", label: "JSON → XML" },
          { value: "xml_to_json", label: "XML → JSON" },
        ],
      },
    ],
    t("jsonXml.note"),
    pick("result"),
  );
}

function SqlMinifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "text",
        label: "SQL",
        kind: "textarea",
        defaultValue: "SELECT  *\nFROM   users  -- active\nWHERE  id = 1;",
        rows: 8,
      },
    ],
    t("sqlMinify.note"),
    pick("result"),
  );
}

function LineNumbersCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("alpha\nbeta\ngamma", t("common.text")),
      { key: "start", label: t("lineNum.start"), kind: "number", defaultValue: "1" },
    ],
    t("lineNum.note"),
    pick("result"),
  );
}

function UniqueWordsCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [TEXT_FIELD("one two two three one four", t("common.text"))],
    t("uniqueWords.note"),
    pick("result"),
  );
}

function EpochConvertCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "value",
        label: t("epoch.value"),
        kind: "text",
        defaultValue: String(Date.now()),
      },
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "ms_to_iso",
        options: [
          { value: "ms_to_iso", label: t("epoch.msToIso") },
          { value: "iso_to_ms", label: t("epoch.isoToMs") },
        ],
      },
    ],
    t("epoch.note"),
    pick("result"),
  );
}

function PasswordEntropyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "password",
        label: t("passwordEntropy.password"),
        kind: "password",
        defaultValue: "Nebutra!2026",
      },
    ],
    t("passwordEntropy.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function ColorContrastCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "foreground",
        label: t("contrast.fg"),
        kind: "text",
        defaultValue: "#0033FE",
      },
      {
        key: "background",
        label: t("contrast.bg"),
        kind: "text",
        defaultValue: "#ffffff",
      },
    ],
    t("contrast.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function ExifViewerCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "imageBase64",
        label: t("exif.file"),
        kind: "file-base64",
        accept: "image/*",
      },
    ],
    t("exif.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function FindReplaceRegexCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("foo bar foo", t("common.text")),
      { key: "pattern", label: t("regex.pattern"), kind: "text", defaultValue: "foo" },
      {
        key: "replacement",
        label: t("regex.replacement"),
        kind: "text",
        defaultValue: "baz",
      },
      { key: "flags", label: t("regex.flags"), kind: "text", defaultValue: "g" },
    ],
    t("regex.note"),
    pick("result"),
  );
}

function JwtGenerateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "payload",
        label: t("jwt.payload"),
        kind: "textarea",
        defaultValue: '{\n  "sub": "user_1",\n  "role": "admin"\n}',
        rows: 6,
      },
      {
        key: "secret",
        label: t("jwt.secret"),
        kind: "password",
        defaultValue: "dev-secret-change-me",
      },
      {
        key: "expiresInSec",
        label: t("jwt.exp"),
        kind: "number",
        defaultValue: "3600",
      },
    ],
    t("jwt.note"),
    pick("token"),
  );
}

function RandomNumberCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "min", label: t("rand.min"), kind: "number", defaultValue: "1" },
      { key: "max", label: t("rand.max"), kind: "number", defaultValue: "100" },
      { key: "count", label: t("rand.count"), kind: "number", defaultValue: "5" },
    ],
    t("rand.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function DiceRollCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "sides", label: t("dice.sides"), kind: "number", defaultValue: "6" },
      { key: "count", label: t("dice.count"), kind: "number", defaultValue: "2" },
    ],
    t("dice.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function HexRgbCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "text", label: t("common.text"), kind: "text", defaultValue: "#0033FE" },
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "hex_to_rgb",
        options: [
          { value: "hex_to_rgb", label: "HEX → RGB" },
          { value: "rgb_to_hex", label: "RGB → HEX" },
        ],
      },
    ],
    t("hexRgb.note"),
    pick("result"),
  );
}

function Base64UrlCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      TEXT_FIELD("Nebutra Forge", t("common.text")),
      {
        key: "mode",
        label: t("common.mode"),
        kind: "select",
        defaultValue: "encode",
        options: [
          { value: "encode", label: t("common.encode") },
          { value: "decode", label: t("common.decode") },
        ],
      },
    ],
    t("base64url.note"),
    pick("result"),
  );
}

function HmacVerifyCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "message",
        label: t("hmac.message"),
        kind: "textarea",
        defaultValue: "hello",
        rows: 3,
      },
      { key: "secret", label: t("hmac.secret"), kind: "password", defaultValue: "secret" },
      {
        key: "signature",
        label: t("hmac.signature"),
        kind: "text",
        defaultValue: "",
        placeholder: "paste expected hex/base64",
      },
      {
        key: "encoding",
        label: t("multiHash.encoding"),
        kind: "select",
        defaultValue: "hex",
        options: [
          { value: "hex", label: "hex" },
          { value: "base64", label: "base64" },
          { value: "base64url", label: "base64url" },
        ],
      },
    ],
    t("hmac.note"),
    (o) => JSON.stringify(o, null, 2),
  );
}

function SecretGenerateCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      { key: "bytes", label: t("secret.bytes"), kind: "number", defaultValue: "32" },
      {
        key: "encoding",
        label: t("multiHash.encoding"),
        kind: "select",
        defaultValue: "hex",
        options: [
          { value: "hex", label: "hex" },
          { value: "base64", label: "base64" },
          { value: "base64url", label: "base64url" },
        ],
      },
      { key: "count", label: t("secret.count"), kind: "number", defaultValue: "1" },
    ],
    t("secret.note"),
    (o) => {
      const secrets = o.secrets;
      if (Array.isArray(secrets)) return secrets.map(String).join("\n");
      return JSON.stringify(o, null, 2);
    },
  );
}

function PdfOptimizeCatalogRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  return g(
    toolId,
    [
      {
        key: "fileBase64",
        label: t("pdfOptimize.file"),
        kind: "file-base64",
        accept: "application/pdf,.pdf",
      },
    ],
    t("pdfOptimize.note"),
    (o) => {
      // Prefer human metrics + downloadable base64 length
      const summary = {
        bytesIn: o.bytesIn,
        bytesOut: o.bytesOut,
        saved: o.saved,
        savedPercent: o.savedPercent,
        pageCount: o.pageCount,
        note: o.note,
        hasPdf: typeof o.base64 === "string",
      };
      return JSON.stringify(summary, null, 2);
    },
  );
}

function unitRunner(toolId: string, slug: string) {
  const defaults: Record<string, { from: string; to: string; value: string; units: string[] }> = {
    length: {
      from: "m",
      to: "ft",
      value: "1",
      units: ["m", "km", "cm", "mm", "in", "ft", "yd", "mi", "nmi"],
    },
    weight: {
      from: "kg",
      to: "lb",
      value: "1",
      units: ["kg", "g", "mg", "lb", "oz", "t", "st"],
    },
    temperature: {
      from: "C",
      to: "F",
      value: "25",
      units: ["C", "F", "K"],
    },
    area: {
      from: "m2",
      to: "mu",
      value: "1",
      units: ["m2", "km2", "ha", "mu", "ft2", "acre"],
    },
    speed: {
      from: "km/h",
      to: "mph",
      value: "100",
      units: ["m/s", "km/h", "mph", "kn", "ft/s"],
    },
    volume: {
      from: "L",
      to: "gal_us",
      value: "1",
      units: ["L", "mL", "m3", "gal_us", "gal_uk", "cup_us"],
    },
  };
  const d = defaults[slug] ?? defaults.length!;
  const opts = d.units.map((u) => ({ value: u, label: u }));
  return g(
    toolId,
    [
      { key: "value", label: "Value", kind: "number", defaultValue: d.value },
      { key: "from", label: "From", kind: "select", defaultValue: d.from, options: opts },
      { key: "to", label: "To", kind: "select", defaultValue: d.to, options: opts },
    ],
    "SI conversion table",
    pick("result"),
  );
}
