"use client";

import { useTranslations } from "next-intl";
import { Base64Runner } from "@/components/base64-runner";
import {
  AgeCalculatorRunner,
  AspectRatioRunner,
  ChecksumTextRunner,
  ColorContrastRunner,
  CountCharsRunner,
  DiceRollRunner,
  EpochConvertRunner,
  FindReplaceRegexRunner,
  HexRgbRunner,
  HmacVerifyRunner,
  JwtGenerateRunner,
  LoremWordsRunner,
  MimeLookupRunner,
  PercentageChangeRunner,
  RandomNumberRunner,
  RomanNumeralsRunner,
  SecretGenerateRunner,
  StringSimilarityRunner,
  TipCalculatorRunner,
  UrlParseRunner,
  UserAgentParseRunner,
  WeekdayRunner,
  WordFrequencyRunner,
} from "@/components/catalog-converge-runners";
import {
  CreditCardLuhnRunner,
  EmailValidateRunner,
  HashCompareRunner,
  IpValidateRunner,
  LoremIpsumRunner,
  MarkdownTocRunner,
  PasswordEntropyRunner,
  RandomStringRunner,
  ReadingTimeRunner,
  UrlValidateRunner,
  UuidValidateRunner,
  WorldClockRunner,
} from "@/components/catalog-polish-runners";
import { CatalogRunnerRouter } from "@/components/catalog-runners";
import { CodecModeRunner } from "@/components/codec-mode-runner";
import {
  ExifViewerRunner,
  ImageMetaRunner,
  PdfInfoRunner,
  PdfOptimizeRunner,
} from "@/components/file-inspect-runners";
import {
  BmiRunner,
  DataSizeRunner,
  DateDiffRunner,
  PercentageRunner,
  RmbUppercaseRunner,
} from "@/components/form-runners";
import { FormatLiveRunner } from "@/components/format-live-runner";
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
  TimezoneRunner,
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
  LinePrefixSuffixRunner,
  LunarRunner,
  MortgageRunner,
  NanoidRunner,
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
  SvgOptimizeRunner,
  XlsxTextRunner,
} from "@/components/sota-runners";
import { TextDiffRunner } from "@/components/text-diff-runner";
import { pickResult, TextTransformRunner } from "@/components/text-transform-runner";
import { TimestampRunner } from "@/components/timestamp-runner";
import { TokenCountRunner } from "@/components/token-count-runner";
import { UuidRunner } from "@/components/uuid-runner";
import { W3BusinessDayShiftRunner } from "@/components/w3-business-day-shift-runner";
import { W3CsvColumnsRunner } from "@/components/w3-csv-columns-runner";
import { W3CsvDiffRunner } from "@/components/w3-csv-diff-runner";
import { W3DockerfileStarterRunner } from "@/components/w3-dockerfile-starter-runner";
import { W3EanUpcGtinRunner } from "@/components/w3-ean-upc-gtin-runner";
import { W3EditorconfigGeneratorRunner } from "@/components/w3-editorconfig-generator-runner";
import { W3EncodingDetectRunner } from "@/components/w3-encoding-detect-runner";
import { W3EnvDiffRunner } from "@/components/w3-env-diff-runner";
import { W3ExifStripRunner } from "@/components/w3-exif-strip-runner";
import { W3FileTypeDetectRunner } from "@/components/w3-file-type-detect-runner";
import { W3GitignoreGeneratorRunner } from "@/components/w3-gitignore-generator-runner";
import { W3IbanRunner } from "@/components/w3-iban-runner";
import { W3ImageRotateFlipRunner } from "@/components/w3-image-rotate-flip-runner";
import { W3IsbnRunner } from "@/components/w3-isbn-runner";
import { W3LanguageDetectRunner } from "@/components/w3-language-detect-runner";
import { W3LicenseChooserRunner } from "@/components/w3-license-chooser-runner";
import { W3LineEndingDetectRunner } from "@/components/w3-line-ending-detect-runner";
import { W3ListSetCompareRunner } from "@/components/w3-list-set-compare-runner";
import { W3LoanAmortizationRunner } from "@/components/w3-loan-amortization-runner";
import { W3ReadmeSkeletonGeneratorRunner } from "@/components/w3-readme-skeleton-generator-runner";
import { W3RetryBackoffScheduleRunner } from "@/components/w3-retry-backoff-schedule-runner";
import { W3RobotsTxtGeneratorRunner } from "@/components/w3-robots-txt-generator-runner";
import { W3SecretScanRunner } from "@/components/w3-secret-scan-runner";
import { W3UnifiedSocialCreditCodeRunner } from "@/components/w3-unified-social-credit-code-runner";
import { W3VinRunner } from "@/components/w3-vin-runner";
import { W3YamlDiffRunner } from "@/components/w3-yaml-diff-runner";
import {
  ColorDeltaERunner,
  DbmlParseRunner,
  DbmlToSqlRunner,
  DnsLeakRunner,
  DnsLookupRunner,
  MermaidRenderRunner,
  MyIpRunner,
  SqlToDbmlRunner,
  TlsCertInspectRunner,
} from "@/components/wave6-runners";
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
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'<root><item id="1">a</item><item id="2">b</item></root>'}
          downloadName="data.xml"
          note="XML format · same path as API"
        />
      );
    case "csv-preview":
      return <CsvPreviewRunner toolId={toolId} />;
    case "sql-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"select id,name from users where active=1 order by id"}
          downloadName="query.sql"
          note="SQL format · same path as API"
        />
      );
    case "js-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"const x={a:1,b:2}\nfunction f(){return x}"}
          downloadName="formatted.js"
          note="Prettier · same path as API"
          extraFields={[
            {
              key: "parser",
              label: "Parser",
              kind: "select",
              defaultValue: "babel",
              options: [
                { value: "babel", label: "babel" },
                { value: "typescript", label: "typescript" },
                { value: "json", label: "json" },
              ],
            },
          ]}
        />
      );
    case "css-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={".btn{color:#0033FE;margin:0 auto}"}
          downloadName="styles.css"
          extraFields={[{ key: "indent", label: "Indent", kind: "number", defaultValue: "2" }]}
        />
      );
    case "html-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"<div><p>Hello</p><span>Forge</span></div>"}
          downloadName="page.html"
          extraFields={[{ key: "indent", label: "Indent", kind: "number", defaultValue: "2" }]}
        />
      );
    case "yaml-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"name:  Nebutra\ntools:  [forge,  tools]"}
          downloadName="config.yaml"
          extraFields={[{ key: "indent", label: "Indent", kind: "number", defaultValue: "2" }]}
        />
      );
    case "toml-format":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'title = "Forge"\nport = 3105'}
          downloadName="config.toml"
        />
      );
    case "css-minify":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={".btn {\n  color: #0033FE;\n  margin: 0 auto;\n}\n"}
          downloadName="styles.min.css"
        />
      );
    case "html-minify":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"<div>\n  <p>Hello</p>\n  <span>Forge</span>\n</div>"}
          downloadName="page.min.html"
        />
      );
    case "xml-minify":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'<root>\n  <item id="1">a</item>\n</root>'}
          downloadName="data.min.xml"
        />
      );
    case "json-minify":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'{\n  "name": "Nebutra",\n  "ok": true\n}'}
          downloadName="data.min.json"
        />
      );
    case "sql-minify":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"SELECT  id,\n  name\nFROM users\nWHERE active = 1;"}
          downloadName="query.min.sql"
        />
      );
    case "world-clock":
      return <WorldClockRunner toolId={toolId} />;
    case "email-validate":
      return <EmailValidateRunner toolId={toolId} />;
    case "url-validate":
      return <UrlValidateRunner toolId={toolId} />;
    case "ip-validate":
      return <IpValidateRunner toolId={toolId} />;
    case "uuid-validate":
      return <UuidValidateRunner toolId={toolId} />;
    case "credit-card-luhn":
      return <CreditCardLuhnRunner toolId={toolId} />;
    case "reading-time":
      return <ReadingTimeRunner toolId={toolId} />;
    case "password-entropy":
      return <PasswordEntropyRunner toolId={toolId} />;
    case "random-string":
      return <RandomStringRunner toolId={toolId} />;
    case "lorem-ipsum":
      return <LoremIpsumRunner toolId={toolId} />;
    case "markdown-toc":
      return <MarkdownTocRunner toolId={toolId} />;
    case "hash-compare":
      return <HashCompareRunner toolId={toolId} />;
    case "dns-lookup":
      return <DnsLookupRunner toolId={toolId} />;
    case "tls-cert-inspect":
      return <TlsCertInspectRunner toolId={toolId} />;
    case "my-ip":
      return <MyIpRunner toolId={toolId} />;
    case "dns-leak":
      return <DnsLeakRunner toolId={toolId} />;
    case "mermaid-render":
      return <MermaidRenderRunner toolId={toolId} />;
    case "color-delta-e":
      return <ColorDeltaERunner toolId={toolId} />;
    case "dbml-parse":
      return <DbmlParseRunner toolId={toolId} />;
    case "dbml-to-sql":
      return <DbmlToSqlRunner toolId={toolId} />;
    case "sql-to-dbml":
      return <SqlToDbmlRunner toolId={toolId} />;
    case "color-contrast":
      return <ColorContrastRunner toolId={toolId} />;
    case "age-calculator":
      return <AgeCalculatorRunner toolId={toolId} />;
    case "tip-calculator":
      return <TipCalculatorRunner toolId={toolId} />;
    case "aspect-ratio":
      return <AspectRatioRunner toolId={toolId} />;
    case "percentage-change":
      return <PercentageChangeRunner toolId={toolId} />;
    case "count-chars":
      return <CountCharsRunner toolId={toolId} />;
    case "word-frequency":
      return <WordFrequencyRunner toolId={toolId} />;
    case "find-replace-regex":
      return <FindReplaceRegexRunner toolId={toolId} />;
    case "string-similarity":
      return <StringSimilarityRunner toolId={toolId} />;
    case "mime-lookup":
      return <MimeLookupRunner toolId={toolId} />;
    case "user-agent-parse":
      return <UserAgentParseRunner toolId={toolId} />;
    case "roman-numerals":
      return <RomanNumeralsRunner toolId={toolId} />;
    case "epoch-convert":
      return <EpochConvertRunner toolId={toolId} />;
    case "hex-rgb":
      return <HexRgbRunner toolId={toolId} />;
    case "url-parse":
      return <UrlParseRunner toolId={toolId} />;
    case "random-number":
      return <RandomNumberRunner toolId={toolId} />;
    case "dice-roll":
      return <DiceRollRunner toolId={toolId} />;
    case "jwt-generate":
      return <JwtGenerateRunner toolId={toolId} />;
    case "hmac-verify":
      return <HmacVerifyRunner toolId={toolId} />;
    case "secret-generate":
      return <SecretGenerateRunner toolId={toolId} />;
    case "checksum-text":
      return <ChecksumTextRunner toolId={toolId} />;
    case "weekday":
      return <WeekdayRunner toolId={toolId} />;
    case "lorem-words":
      return <LoremWordsRunner toolId={toolId} />;
    case "rot13":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="Hello Nebutra"
          downloadName="rot13.txt"
          extraFields={[{ key: "shift", label: "Shift", kind: "number", defaultValue: "13" }]}
        />
      );
    case "morse":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="SOS HELP"
          downloadName="morse.txt"
          extraFields={[
            {
              key: "mode",
              label: "Mode",
              kind: "select",
              defaultValue: "encode",
              options: [
                { value: "encode", label: "Text → Morse" },
                { value: "decode", label: "Morse → Text" },
              ],
            },
          ]}
        />
      );
    case "text-binary":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="Hello"
          downloadName="binary.txt"
          extraFields={[
            {
              key: "mode",
              label: "Mode",
              kind: "select",
              defaultValue: "encode",
              options: [
                { value: "encode", label: "Text → Binary" },
                { value: "decode", label: "Binary → Text" },
              ],
            },
          ]}
        />
      );
    case "base32":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="Hello Nebutra"
          downloadName="base32.txt"
          extraFields={[
            {
              key: "mode",
              label: "Mode",
              kind: "select",
              defaultValue: "encode",
              options: [
                { value: "encode", label: "Encode" },
                { value: "decode", label: "Decode" },
              ],
            },
          ]}
        />
      );
    case "base64url":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="Hello Nebutra"
          downloadName="base64url.txt"
          extraFields={[
            {
              key: "mode",
              label: "Mode",
              kind: "select",
              defaultValue: "encode",
              options: [
                { value: "encode", label: "Encode" },
                { value: "decode", label: "Decode" },
              ],
            },
          ]}
        />
      );
    case "line-numbers":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"alpha\nbeta\ngamma"}
          downloadName="numbered.txt"
        />
      );
    case "unique-words":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample="one two one THREE three"
          downloadName="unique-words.txt"
        />
      );
    case "remove-extra-spaces":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"hello   world\n\n  forge  "}
          downloadName="trimmed.txt"
        />
      );
    case "json-xml":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'{"name":"Nebutra","ok":true}'}
          downloadName="converted.xml"
          extraFields={[
            {
              key: "mode",
              label: "Direction",
              kind: "select",
              defaultValue: "json_to_xml",
              options: [
                { value: "json_to_xml", label: "JSON → XML" },
                { value: "xml_to_json", label: "XML → JSON" },
              ],
            },
          ]}
        />
      );
    case "csv-to-json-lite":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={"id,name\n1,Ada\n2,Lin"}
          downloadName="data.json"
        />
      );
    case "json-to-csv-lite":
      return (
        <FormatLiveRunner
          toolId={toolId}
          sample={'[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]'}
          downloadName="data.csv"
        />
      );
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
    case "pdf-optimize":
      return <PdfOptimizeRunner toolId={toolId} />;
    case "pdf-info":
      return <PdfInfoRunner toolId={toolId} />;
    case "image-meta":
      return <ImageMetaRunner toolId={toolId} />;
    case "exif-viewer":
      return <ExifViewerRunner toolId={toolId} />;
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
    case "image-compress":
      return <ImageToolRunner toolId={toolId} mode="compress" />;
    case "image-resize":
      return <ImageToolRunner toolId={toolId} mode="resize" />;
    case "image-convert":
      return <ImageToolRunner toolId={toolId} mode="convert" />;
    case "image-rotate-flip":
      return <W3ImageRotateFlipRunner toolId={toolId} />;
    case "exif-strip":
      return <W3ExifStripRunner toolId={toolId} />;

    case "business-day-shift":
      return <W3BusinessDayShiftRunner toolId={toolId} />;
    case "csv-columns":
      return <W3CsvColumnsRunner toolId={toolId} />;
    case "loan-amortization":
      return <W3LoanAmortizationRunner toolId={toolId} />;
    case "retry-backoff-schedule":
      return <W3RetryBackoffScheduleRunner toolId={toolId} />;
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
