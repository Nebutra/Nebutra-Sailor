"use client";

import { DEFAULT_PUBLIC_MODEL, frontierSelectOptions } from "@nebutra/ai-providers/frontier";
import type { ReactNode } from "react";
import { type FieldDef, GenericInvokeRunner } from "@/components/generic-invoke-runner";

const TEXT_FIELD = (sample = "Hello Nebutra 你好世界"): FieldDef => ({
  key: "text",
  label: "文本",
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

/** New Wave A/B/C tools that use the generic multi-field runner. Returns null if unhandled. */
export function resolveCatalogRunner(slug: string, toolId: string): ReactNode {
  switch (slug) {
    case "zh-cn-tw":
      return g(
        toolId,
        [
          TEXT_FIELD("汉字与计算机，繁體測試"),
          {
            key: "mode",
            label: "方向",
            kind: "select",
            defaultValue: "s2t",
            options: [
              { value: "s2t", label: "简 → 繁" },
              { value: "t2s", label: "繁 → 简" },
              { value: "s2tw", label: "简 → 台湾" },
              { value: "tw2s", label: "台湾 → 简" },
              { value: "s2hk", label: "简 → 香港" },
              { value: "hk2s", label: "香港 → 简" },
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
            label: "声调",
            kind: "select",
            defaultValue: "symbol",
            options: [
              { value: "symbol", label: "符号 nǐ" },
              { value: "num", label: "数字 ni3" },
              { value: "none", label: "无调 ni" },
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
          label: "模式",
          kind: "select",
          defaultValue: "to_escape",
          options: [
            { value: "to_escape", label: "→ \\u 转义" },
            { value: "from_escape", label: "← 解码转义" },
            { value: "code_points", label: "码点列表" },
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
            label: "模式",
            kind: "select",
            defaultValue: "parse",
            options: [
              { value: "parse", label: "解析" },
              { value: "stringify", label: "序列化 JSON 对象" },
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
            label: "方向",
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
            label: "方向",
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
            label: "方向",
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
          { key: "maxRows", label: "预览行数", kind: "number", defaultValue: "50" },
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
            label: "模式",
            kind: "select",
            defaultValue: "format",
            options: [
              { value: "format", label: "美化" },
              { value: "minify", label: "压缩" },
              { value: "validate", label: "仅校验" },
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
          { key: "pattern", label: "正则", kind: "text", defaultValue: "\\w+" },
          { key: "flags", label: "标志", kind: "text", defaultValue: "g" },
          TEXT_FIELD("Hello Nebutra 123"),
          {
            key: "mode",
            label: "模式",
            kind: "select",
            defaultValue: "match",
            options: [
              { value: "match", label: "匹配" },
              { value: "replace", label: "替换" },
              { value: "test", label: "test" },
            ],
          },
          { key: "replacement", label: "替换为", kind: "text", defaultValue: "" },
        ],
        "RegExp + 超时预算",
      );

    case "color-convert":
      return g(
        toolId,
        [{ key: "color", label: "颜色", kind: "text", defaultValue: "#0033FE" }],
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
            label: "方言",
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
          { key: "size", label: "长度", kind: "number", defaultValue: "21" },
          { key: "count", label: "数量", kind: "number", defaultValue: "5" },
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
          { key: "count", label: "下次次数", kind: "number", defaultValue: "5" },
          { key: "tz", label: "时区", kind: "text", defaultValue: "Asia/Shanghai" },
        ],
        "cron-parser",
      );

    case "timezone":
      return g(
        toolId,
        [
          {
            key: "datetime",
            label: "时间",
            kind: "text",
            defaultValue: "2024-06-01 12:00:00",
          },
          { key: "fromTz", label: "源时区", kind: "text", defaultValue: "Asia/Shanghai" },
          { key: "toTz", label: "目标时区", kind: "text", defaultValue: "America/New_York" },
        ],
        "dayjs + timezone",
      );

    case "lunar":
      return g(
        toolId,
        [
          {
            key: "mode",
            label: "方向",
            kind: "select",
            defaultValue: "solar_to_lunar",
            options: [
              { value: "solar_to_lunar", label: "公历 → 农历" },
              { value: "lunar_to_solar", label: "农历 → 公历" },
            ],
          },
          { key: "year", label: "年", kind: "number", defaultValue: "2024" },
          { key: "month", label: "月", kind: "number", defaultValue: "6" },
          { key: "day", label: "日", kind: "number", defaultValue: "1" },
          { key: "isLeap", label: "农历闰月", kind: "boolean", defaultValue: false },
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
          { key: "secret", label: "密钥", kind: "password", defaultValue: "secret" },
          {
            key: "algorithm",
            label: "算法",
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
        [{ key: "fileBase64", label: "文件", kind: "file-base64", accept: "*/*" }],
        "node:crypto",
      );

    case "password-strength":
      return g(
        toolId,
        [{ key: "password", label: "密码", kind: "password", defaultValue: "Nebutra!2024" }],
        "zxcvbn-ts",
      );

    case "qr-generate":
      return g(
        toolId,
        [
          {
            key: "text",
            label: "内容",
            kind: "textarea",
            defaultValue: "https://nebutra.com",
            rows: 4,
          },
          {
            key: "format",
            label: "格式",
            kind: "select",
            defaultValue: "png",
            options: [
              { value: "png", label: "PNG" },
              { value: "svg", label: "SVG" },
              { value: "dataurl", label: "Data URL" },
            ],
          },
          { key: "width", label: "宽度", kind: "number", defaultValue: "256" },
        ],
        "qrcode",
      );

    case "qr-decode":
      return g(
        toolId,
        [{ key: "imageBase64", label: "二维码图片", kind: "file-base64", accept: "image/*" }],
        "jsQR + sharp",
        pick("text"),
      );

    case "image-base64":
      return g(toolId, [
        { key: "imageBase64", label: "图片", kind: "file-base64", accept: "image/*" },
        {
          key: "mode",
          label: "模式",
          kind: "select",
          defaultValue: "inspect",
          options: [
            { value: "inspect", label: "解析信息" },
            { value: "to_data_url", label: "转 Data URL" },
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
            label: "模型",
            kind: "select",
            defaultValue: DEFAULT_PUBLIC_MODEL,
            options: [...frontierSelectOptions()],
          },
          { key: "outputTokens", label: "输出 tokens 估", kind: "number", defaultValue: "500" },
        ],
        "模型目录 SSOT: @nebutra/ai-providers/frontier · js-tiktoken",
      );

    case "json-schema-validate":
      return g(
        toolId,
        [
          {
            key: "data",
            label: "JSON 数据",
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
          { key: "principal", label: "本金", kind: "number", defaultValue: "1000000" },
          { key: "annualRatePercent", label: "年利率 %", kind: "number", defaultValue: "3.1" },
          { key: "years", label: "年限", kind: "number", defaultValue: "30" },
          {
            key: "method",
            label: "方式",
            kind: "select",
            defaultValue: "equal_installment",
            options: [
              { value: "equal_installment", label: "等额本息" },
              { value: "equal_principal", label: "等额本金" },
            ],
          },
        ],
        "标准摊还公式",
      );

    case "kinship":
      return g(toolId, [
        { key: "relation", label: "关系描述", kind: "text", defaultValue: "爸爸的爸爸" },
      ]);

    case "id-card":
      return g(
        toolId,
        [{ key: "id", label: "身份证号", kind: "text", defaultValue: "11010519491231002X" }],
        "GB 11643 校验位",
      );

    case "phone-lookup":
      return g(
        toolId,
        [{ key: "phone", label: "手机号", kind: "text", defaultValue: "13800138000" }],
        "号段粗分（非完整归属地库）",
      );

    case "pdf-merge":
      return g(
        toolId,
        [
          {
            key: "filesBase64",
            label: "说明",
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
          { key: "fromPage", label: "起始页", kind: "number", defaultValue: "1" },
          { key: "toPage", label: "结束页", kind: "number", defaultValue: "1" },
        ],
        "pdf-lib",
      );

    case "image-watermark":
      return g(
        toolId,
        [
          { key: "imageBase64", label: "图片", kind: "file-base64", accept: "image/*" },
          { key: "text", label: "水印文字", kind: "text", defaultValue: "Nebutra" },
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
        { key: "find", label: "查找", kind: "text", defaultValue: "foo" },
        { key: "replace", label: "替换为", kind: "text", defaultValue: "baz" },
        { key: "regex", label: "正则", kind: "boolean", defaultValue: false },
      ]);

    case "line-prefix-suffix":
      return g(toolId, [
        TEXT_FIELD("apple\nbanana\ncherry"),
        { key: "prefix", label: "前缀", kind: "text", defaultValue: "- " },
        { key: "suffix", label: "后缀", kind: "text", defaultValue: "" },
      ]);

    case "fullwidth-halfwidth":
      return g(toolId, [
        TEXT_FIELD("Ｈｅｌｌｏ　世界！"),
        {
          key: "mode",
          label: "方向",
          kind: "select",
          defaultValue: "to_half",
          options: [
            { value: "to_half", label: "全角 → 半角" },
            { value: "to_full", label: "半角 → 全角" },
          ],
        },
      ]);

    default:
      return null;
  }
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
      { key: "value", label: "数值", kind: "number", defaultValue: d.value },
      { key: "from", label: "从", kind: "select", defaultValue: d.from, options: opts },
      { key: "to", label: "到", kind: "select", defaultValue: d.to, options: opts },
    ],
    "SI 换算表",
    pick("result"),
  );
}
