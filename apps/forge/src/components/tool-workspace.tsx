"use client";

import { Base64Runner } from "@/components/base64-runner";
import { resolveCatalogRunner } from "@/components/catalog-runners";
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
  QrGenerateRunner,
  RegexTesterRunner,
  SqlFormatRunner,
  TimezoneRunner,
  XmlFormatRunner,
} from "@/components/p0-runners";
import { PasswordRunner } from "@/components/password-runner";
import { TextDiffRunner } from "@/components/text-diff-runner";
import { pickResult, TextTransformRunner } from "@/components/text-transform-runner";
import { TimestampRunner } from "@/components/timestamp-runner";
import { TokenCountRunner } from "@/components/token-count-runner";
import { UuidRunner } from "@/components/uuid-runner";
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
  switch (slug) {
    case "word-count":
      return <WordCountRunner toolId={toolId} />;
    case "json-format":
      return <JsonFormatRunner toolId={toolId} />;
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
    case "regex-tester":
      return <RegexTesterRunner toolId={toolId} />;
    case "sql-format":
      return <SqlFormatRunner toolId={toolId} />;
    case "color-convert":
      return <ColorConvertRunner toolId={toolId} />;
    case "qr-generate":
      return <QrGenerateRunner toolId={toolId} />;
    case "qr-decode":
      return <QrDecodeRunner toolId={toolId} />;
    case "cron-explain":
      return <CronExplainRunner toolId={toolId} />;
    case "timezone":
      return <TimezoneRunner toolId={toolId} />;

    default: {
      const catalog = resolveCatalogRunner(slug, toolId);
      if (catalog) return catalog;
      if (category === "image") {
        return <ImageToolRunner toolId={toolId} />;
      }
      return <p className="text-sm text-[var(--status-danger)]">未配置工作台：{slug}</p>;
    }
  }
}
