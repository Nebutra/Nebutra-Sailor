"use client";

import { useTranslations } from "next-intl";
import { Base64Runner } from "@/components/base64-runner";
import { CatalogRunnerRouter } from "@/components/catalog-runners";
import { CodecModeRunner } from "@/components/codec-mode-runner";
import {
  BmiRunner,
  DataSizeRunner,
  DateDiffRunner,
  PercentageRunner,
  RmbUppercaseRunner,
} from "@/components/form-runners";
import { HashRunner } from "@/components/hash-runner";
import { ImageToolRunner } from "@/components/image-tool-runner";
import { JsonDiffRunner } from "@/components/json-diff-runner";
import { JsonFormatRunner } from "@/components/json-format-runner";
import { JwtRunner } from "@/components/jwt-runner";
import { MdToPdfRunner } from "@/components/md-to-pdf-runner";
import { NumberBaseRunner } from "@/components/number-base-runner";
import {
  ColorConvertRunner,
  ConvertModeRunner,
  CronExplainRunner,
  CsvPreviewRunner,
  JsonPathRunner,
  QrDecodeRunner,
  SqlFormatRunner,
  TimezoneRunner,
  XmlFormatRunner,
} from "@/components/p0-runners";
import {
  CostEstimateRunner,
  FileChecksumRunner,
  HmacRunner,
  JsonSchemaValidateRunner,
  MarkdownPreviewRunner,
  PasswordStrengthRunner,
  PdfMergeRunner,
  PdfSplitRunner,
  PinyinRunner,
  ZhCnTwRunner,
} from "@/components/p1-runners";
import {
  FullwidthHalfwidthRunner,
  IdCardRunner,
  ImageBase64Runner,
  KinshipRunner,
  LinePrefixSuffixRunner,
  LunarRunner,
  MortgageRunner,
  NanoidRunner,
  PhoneLookupRunner,
  QueryStringRunner,
  TextReplaceRunner,
  TrimWhitespaceRunner,
  UnicodeRunner,
  UnitConvertRunner,
} from "@/components/p2-runners";
import { PasswordRunner } from "@/components/password-runner";
import { PdfCompressRunner } from "@/components/pdf-compress-runner";
import {
  DocxTextRunner,
  ImageCropRunner,
  MultiHashSotaRunner,
  PdfTextRunner,
  PptxTextRunner,
  QrSotaRunner,
  RegexSotaRunner,
  RouterTranslateRunner,
  SvgOptimizeRunner,
  XlsxTextRunner,
} from "@/components/sota-runners";
import { TextDiffRunner } from "@/components/text-diff-runner";
import { pickResult, TextTransformRunner } from "@/components/text-transform-runner";
import { TimestampRunner } from "@/components/timestamp-runner";
import { TokenCountRunner } from "@/components/token-count-runner";
import { UuidRunner } from "@/components/uuid-runner";
import { W3CsvDiffRunner } from "@/components/w3-csv-diff-runner";
import { W3DockerfileStarterRunner } from "@/components/w3-dockerfile-starter-runner";
import { W3EanUpcGtinRunner } from "@/components/w3-ean-upc-gtin-runner";
import { W3EditorconfigGeneratorRunner } from "@/components/w3-editorconfig-generator-runner";
import { W3EncodingDetectRunner } from "@/components/w3-encoding-detect-runner";
import { W3EnvDiffRunner } from "@/components/w3-env-diff-runner";
import { W3FileTypeDetectRunner } from "@/components/w3-file-type-detect-runner";
import { W3GitignoreGeneratorRunner } from "@/components/w3-gitignore-generator-runner";
import { W3IbanRunner } from "@/components/w3-iban-runner";
import { W3IsbnRunner } from "@/components/w3-isbn-runner";
import { W3LanguageDetectRunner } from "@/components/w3-language-detect-runner";
import { W3LicenseChooserRunner } from "@/components/w3-license-chooser-runner";
import { W3LineEndingDetectRunner } from "@/components/w3-line-ending-detect-runner";
import { W3ListSetCompareRunner } from "@/components/w3-list-set-compare-runner";
import { W3ReadmeSkeletonGeneratorRunner } from "@/components/w3-readme-skeleton-generator-runner";
import { W3RobotsTxtGeneratorRunner } from "@/components/w3-robots-txt-generator-runner";
import { W3SecretScanRunner } from "@/components/w3-secret-scan-runner";
import { W3UnifiedSocialCreditCodeRunner } from "@/components/w3-unified-social-credit-code-runner";
import { W3VinRunner } from "@/components/w3-vin-runner";
import { W3YamlDiffRunner } from "@/components/w3-yaml-diff-runner";
import { WordCountRunner } from "@/components/word-count-runner";

function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function toggleCase(text: string): string {
  return [...text]
    .map((ch) => {
      const upper = ch.toUpperCase();
      const lower = ch.toLowerCase();
      if (ch === upper && ch !== lower) return lower;
      if (ch === lower && ch !== upper) return upper;
      return ch;
    })
    .join("");
}

function camelSnakeLocal(text: string, mode: string | undefined): string {
  const m = mode ?? "to_snake";
  if (m === "to_snake") {
    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[-\s]+/g, "_")
      .toLowerCase();
  }
  if (m === "to_kebab") {
    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[_\s]+/g, "-")
      .toLowerCase();
  }
  return text.toLowerCase().replace(/[-_]+([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function caseConvertLocal(text: string, mode: string | undefined): string {
  switch (mode ?? "upper") {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return titleCase(text);
    case "toggle":
      return toggleCase(text);
    default:
      return text;
  }
}

/**
 * Maps tool slug → dedicated productized runner.
 * No generic JSON ToolRunner fallback for catalog tools.
 */
export function ToolWorkspace({
  slug,
  toolId,
  category,
}: {
  slug: string;
  toolId: string;
  category: string;
}) {
  const tRunners = useTranslations("runners.common");
  switch (slug) {
    case "word-count":
      return <WordCountRunner toolId={toolId} />;
    case "json-format":
      return <JsonFormatRunner toolId={toolId} />;
    case "json-diff":
      return <JsonDiffRunner toolId={toolId} />;
    case "text-diff":
      return <TextDiffRunner toolId={toolId} />;
    case "base64":
      return <Base64Runner toolId={toolId} />;
    case "url-encode":
      return <CodecModeRunner toolId={toolId} kind="url" />;
    case "html-entities":
      return <CodecModeRunner toolId={toolId} kind="html" />;
    case "hex":
      return <CodecModeRunner toolId={toolId} kind="hex" />;
    case "unix-timestamp":
      return <TimestampRunner toolId={toolId} />;
    case "uuid":
      return <UuidRunner toolId={toolId} />;
    case "md-to-pdf":
      return <MdToPdfRunner toolId={toolId} />;
    case "md5":
      return <HashRunner toolId={toolId} algorithm="md5" />;
    case "sha1":
      return <HashRunner toolId={toolId} algorithm="sha1" />;
    case "sha256":
      return <HashRunner toolId={toolId} algorithm="sha256" />;
    case "password-generate":
      return <PasswordRunner toolId={toolId} />;
    case "number-base":
      return <NumberBaseRunner toolId={toolId} />;
    case "jwt-decode":
      return <JwtRunner toolId={toolId} />;
    case "token-count":
      return <TokenCountRunner toolId={toolId} />;
    case "bmi":
      return <BmiRunner toolId={toolId} />;
    case "percentage":
      return <PercentageRunner toolId={toolId} />;
    case "data-size":
      return <DataSizeRunner toolId={toolId} />;
    case "rmb-uppercase":
      return <RmbUppercaseRunner toolId={toolId} />;
    case "date-diff":
      return <DateDiffRunner toolId={toolId} />;

    case "case-convert":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample="Hello Nebutra 你好世界"
          modes={[
            { value: "upper", label: "大写" },
            { value: "lower", label: "小写" },
            { value: "title", label: "标题" },
            { value: "toggle", label: "切换大小写" },
          ]}
          defaultMode="upper"
          pickOutput={pickResult}
          localRun={(text, mode) => caseConvertLocal(text, mode)}
          note="本地 + 服务端 · 与 API 同一路径"
        />
      );

    case "camel-snake":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample="helloWorldFooBar"
          modes={[
            { value: "to_snake", label: "→ snake_case" },
            { value: "to_camel", label: "→ camelCase" },
            { value: "to_kebab", label: "→ kebab-case" },
          ]}
          defaultMode="to_snake"
          pickOutput={pickResult}
          localRun={(text, mode) => camelSnakeLocal(text, mode)}
          note="命名风格转换 · 与 API 同一路径"
        />
      );

    case "sort-lines":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={"banana\napple\ncherry\napple"}
          pickOutput={pickResult}
          localRun={(text) =>
            text
              .split(/\r\n|\r|\n/)
              .sort((a, b) => a.localeCompare(b))
              .join("\n")
          }
        />
      );

    case "unique-lines":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={"a\nb\na\nc\nb"}
          pickOutput={pickResult}
          localRun={(text) => {
            const seen = new Set<string>();
            const out: string[] = [];
            for (const line of text.split(/\r\n|\r|\n/)) {
              if (!seen.has(line)) {
                seen.add(line);
                out.push(line);
              }
            }
            return out.join("\n");
          }}
        />
      );

    case "remove-blank-lines":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={"line1\n\nline2\n  \nline3"}
          pickOutput={pickResult}
          localRun={(text) =>
            text
              .split(/\r\n|\r|\n/)
              .filter((line) => line.trim().length > 0)
              .join("\n")
          }
        />
      );

    case "reverse-text":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample="Hello Nebutra 你好"
          pickOutput={pickResult}
          localRun={(text) => [...text].reverse().join("")}
        />
      );

    case "strip-html":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={"<p>Hello <b>Nebutra</b></p>"}
          pickOutput={pickResult}
          localRun={(text) => text.replace(/<[^>]*>/g, "")}
        />
      );

    case "slugify":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample="Hello Nebutra — Forge Tools!"
          pickOutput={pickResult}
          localRun={(text) =>
            text
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
          }
        />
      );

    case "extract-urls":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={"See https://nebutra.com and http://example.com/path?q=1 for more."}
          pickOutput={pickResult}
          localRun={(text) => (text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? []).join("\n")}
        />
      );

    case "extract-emails":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample="Contact a@nebutra.com or support@example.org today."
          pickOutput={pickResult}
          localRun={(text) =>
            (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).join("\n")
          }
        />
      );

    case "json-to-ts":
      return (
        <TextTransformRunner
          toolId={toolId}
          sample={`{\n  "id": 1,\n  "name": "Nebutra",\n  "tags": ["forge", "tools"],\n  "active": true\n}`}
          extraFields={[
            {
              key: "name",
              label: "接口名",
              defaultValue: "Root",
              placeholder: "Root",
            },
          ]}
          pickOutput={pickResult}
          note="从 JSON 样本生成 interface 草图 · 与 API 同一路径"
          rows={12}
        />
      );

    // ── P0 specialized workspaces (override generic catalog forms) ─────
    case "json-yaml":
      return (
        <ConvertModeRunner
          toolId={toolId}
          defaultMode="json_to_yaml"
          modes={[
            { value: "json_to_yaml", label: "JSON → YAML" },
            { value: "yaml_to_json", label: "YAML → JSON" },
          ]}
          sample={`{\n  "name": "Nebutra Forge",\n  "tools": 79,\n  "ready": true\n}`}
          note="js-yaml · 与 API 同一路径"
        />
      );
    case "json-toml":
      return (
        <ConvertModeRunner
          toolId={toolId}
          defaultMode="json_to_toml"
          modes={[
            { value: "json_to_toml", label: "JSON → TOML" },
            { value: "toml_to_json", label: "TOML → JSON" },
          ]}
          sample={`{\n  "title": "Forge",\n  "port": 3105\n}`}
          note="smol-toml · 与 API 同一路径"
        />
      );
    case "json-csv":
      return (
        <ConvertModeRunner
          toolId={toolId}
          defaultMode="json_to_csv"
          modes={[
            { value: "json_to_csv", label: "JSON → CSV" },
            { value: "csv_to_json", label: "CSV → JSON" },
          ]}
          sample={`[\n  {"id": 1, "name": "Ada"},\n  {"id": 2, "name": "Lin"}\n]`}
          note="papaparse · 与 API 同一路径"
        />
      );
    case "json-path":
      return <JsonPathRunner toolId={toolId} />;
    case "xml-format":
      return <XmlFormatRunner toolId={toolId} />;
    case "csv-preview":
      return <CsvPreviewRunner toolId={toolId} />;
    case "sql-format":
      return <SqlFormatRunner toolId={toolId} />;
    case "js-format":
      return <CatalogRunnerRouter slug={slug} toolId={toolId} />;
    case "world-clock":
      return <CatalogRunnerRouter slug={slug} toolId={toolId} />;
    case "color-convert":
      return <ColorConvertRunner toolId={toolId} />;
    case "qr-generate":
      return <QrSotaRunner toolId={toolId} />;
    case "qr-decode":
      return <QrDecodeRunner toolId={toolId} />;
    case "cron-explain":
      return <CronExplainRunner toolId={toolId} />;
    case "timezone":
      return <TimezoneRunner toolId={toolId} />;
    case "regex-tester":
      return <RegexSotaRunner toolId={toolId} />;
    case "multi-hash":
      return <MultiHashSotaRunner toolId={toolId} />;
    case "pdf-text":
      return <PdfTextRunner toolId={toolId} />;
    case "docx-text":
      return <DocxTextRunner toolId={toolId} />;
    case "xlsx-text":
      return <XlsxTextRunner toolId={toolId} />;
    case "pptx-text":
      return <PptxTextRunner toolId={toolId} />;
    case "svg-optimize":
      return <SvgOptimizeRunner toolId={toolId} />;
    case "router-translate":
      return <RouterTranslateRunner toolId={toolId} />;
    case "image-crop":
      return <ImageCropRunner toolId={toolId} />;

    // ── P1 specialized workspaces (#255) ────────────────────────────────
    case "markdown-preview":
      return <MarkdownPreviewRunner toolId={toolId} mode="preview" />;
    case "md-to-html":
      return <MarkdownPreviewRunner toolId={toolId} mode="html" />;
    case "pdf-merge":
      return <PdfMergeRunner toolId={toolId} />;
    case "pdf-split":
      return <PdfSplitRunner toolId={toolId} />;
    case "pdf-compress":
      return <PdfCompressRunner toolId={toolId} />;
    case "password-strength":
      return <PasswordStrengthRunner toolId={toolId} />;
    case "hmac":
      return <HmacRunner toolId={toolId} />;
    case "file-checksum":
      return <FileChecksumRunner toolId={toolId} />;
    case "cost-estimate":
      return <CostEstimateRunner toolId={toolId} />;
    case "json-schema-validate":
      return <JsonSchemaValidateRunner toolId={toolId} />;
    case "zh-cn-tw":
      return <ZhCnTwRunner toolId={toolId} />;
    case "pinyin":
      return <PinyinRunner toolId={toolId} />;

    // ── P2 specialized workspaces (#256) ────────────────────────────────
    case "length":
    case "weight":
    case "temperature":
    case "area":
    case "speed":
    case "volume":
      return <UnitConvertRunner toolId={toolId} family={slug} />;
    case "unicode":
      return <UnicodeRunner toolId={toolId} />;
    case "query-string":
      return <QueryStringRunner toolId={toolId} />;
    case "image-base64":
      return <ImageBase64Runner toolId={toolId} />;
    case "fullwidth-halfwidth":
      return <FullwidthHalfwidthRunner toolId={toolId} />;
    case "trim-whitespace":
      return <TrimWhitespaceRunner toolId={toolId} />;
    case "text-replace":
      return <TextReplaceRunner toolId={toolId} />;
    case "line-prefix-suffix":
      return <LinePrefixSuffixRunner toolId={toolId} />;
    case "nanoid":
      return <NanoidRunner toolId={toolId} />;
    case "sha512":
      return <HashRunner toolId={toolId} algorithm="sha512" />;
    case "id-card":
      return <IdCardRunner toolId={toolId} />;
    case "mortgage":
      return <MortgageRunner toolId={toolId} />;
    case "lunar":
      return <LunarRunner toolId={toolId} />;
    case "phone-lookup":
      return <PhoneLookupRunner toolId={toolId} />;
    case "kinship":
      return <KinshipRunner toolId={toolId} />;
    case "image-compress":
      return <ImageToolRunner toolId={toolId} mode="compress" />;
    case "image-resize":
      return <ImageToolRunner toolId={toolId} mode="resize" />;
    case "image-convert":
      return <ImageToolRunner toolId={toolId} mode="convert" />;

    case "csv-diff":
      return <W3CsvDiffRunner toolId={toolId} />;
    case "dockerfile-starter":
      return <W3DockerfileStarterRunner toolId={toolId} />;
    case "ean-upc-gtin":
      return <W3EanUpcGtinRunner toolId={toolId} />;
    case "editorconfig-generator":
      return <W3EditorconfigGeneratorRunner toolId={toolId} />;
    case "encoding-detect":
      return <W3EncodingDetectRunner toolId={toolId} />;
    case "env-diff":
      return <W3EnvDiffRunner toolId={toolId} />;
    case "file-type-detect":
      return <W3FileTypeDetectRunner toolId={toolId} />;
    case "gitignore-generator":
      return <W3GitignoreGeneratorRunner toolId={toolId} />;
    case "gitignore-stacks":
      return <W3GitignoreGeneratorRunner toolId={toolId} />;
    case "iban":
      return <W3IbanRunner toolId={toolId} />;
    case "isbn":
      return <W3IsbnRunner toolId={toolId} />;
    case "language-detect":
      return <W3LanguageDetectRunner toolId={toolId} />;
    case "license-recommend":
      return <W3LicenseChooserRunner toolId={toolId} />;
    case "license-generate":
      return <W3LicenseChooserRunner toolId={toolId} />;
    case "line-ending-detect":
      return <W3LineEndingDetectRunner toolId={toolId} />;
    case "list-set-compare":
      return <W3ListSetCompareRunner toolId={toolId} />;
    case "readme-skeleton-generator":
      return <W3ReadmeSkeletonGeneratorRunner toolId={toolId} />;
    case "robots-txt-generator":
      return <W3RobotsTxtGeneratorRunner toolId={toolId} />;
    case "secret-scan":
      return <W3SecretScanRunner toolId={toolId} />;
    case "unified-social-credit-code":
      return <W3UnifiedSocialCreditCodeRunner toolId={toolId} />;
    case "vin":
      return <W3VinRunner toolId={toolId} />;
    case "yaml-diff":
      return <W3YamlDiffRunner toolId={toolId} />;

    default:
      return (
        <CatalogRunnerRouter
          slug={slug}
          toolId={toolId}
          fallback={
            category === "image" ? (
              <ImageToolRunner toolId={toolId} />
            ) : (
              <p className="text-sm text-[var(--status-danger)]">
                {tRunners("workspaceMissing", { slug })}
              </p>
            )
          }
        />
      );
  }
}
