/**
 * Structured data format tools — js-yaml, smol-toml, papaparse, fast-xml-parser, jsonpath-plus.
 */
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import * as yaml from "js-yaml";
import { JSONPath } from "jsonpath-plus";
import Papa from "papaparse";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const jsonYamlTool = tool({
  id: "data/json-yaml",
  slug: "json-yaml",
  category: "data",
  title: { zh: "JSON ⇄ YAML", en: "JSON ↔ YAML" },
  description: { zh: "js-yaml 双向转换", en: "Convert between JSON and YAML via js-yaml" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.json_yaml",
  engine: { name: "js-yaml", upstream: "https://github.com/nodeca/js-yaml", version: "4.x" },
  seoKeywords: { zh: "json转yaml,yaml转json", en: "json to yaml converter online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["json_to_yaml", "yaml_to_json"]).default("json_to_yaml"),
    indent: z.number().int().min(1).max(8).default(2),
  }),
  execute: (input: { text: string; mode?: "json_to_yaml" | "yaml_to_json"; indent?: number }) => {
    const mode = input.mode ?? "json_to_yaml";
    const indent = input.indent ?? 2;
    if (mode === "json_to_yaml") {
      const data: unknown = JSON.parse(input.text);
      return {
        result: yaml.dump(data, { indent, lineWidth: -1, noRefs: true }),
        mode,
        engine: "js-yaml",
      };
    }
    const data = yaml.load(input.text);
    return {
      result: JSON.stringify(data, null, indent),
      mode,
      engine: "js-yaml",
    };
  },
});

export const jsonTomlTool = tool({
  id: "data/json-toml",
  slug: "json-toml",
  category: "data",
  title: { zh: "JSON ⇄ TOML", en: "JSON ↔ TOML" },
  description: { zh: "smol-toml 双向转换", en: "Convert between JSON and TOML via smol-toml" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.json_toml",
  engine: {
    name: "smol-toml",
    upstream: "https://github.com/squirrelchat/smol-toml",
    version: "1.x",
  },
  seoKeywords: { zh: "json转toml,toml转json", en: "json to toml converter" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["json_to_toml", "toml_to_json"]).default("json_to_toml"),
    indent: z.number().int().min(1).max(8).default(2),
  }),
  execute: (input: { text: string; mode?: "json_to_toml" | "toml_to_json"; indent?: number }) => {
    const mode = input.mode ?? "json_to_toml";
    const indent = input.indent ?? 2;
    if (mode === "json_to_toml") {
      const data = JSON.parse(input.text) as Record<string, unknown>;
      return { result: stringifyToml(data), mode, engine: "smol-toml" };
    }
    const data = parseToml(input.text);
    return { result: JSON.stringify(data, null, indent), mode, engine: "smol-toml" };
  },
});

export const jsonCsvTool = tool({
  id: "data/json-csv",
  slug: "json-csv",
  category: "data",
  title: { zh: "JSON ⇄ CSV", en: "JSON ↔ CSV" },
  description: {
    zh: "Papa Parse 数组对象与 CSV 互转",
    en: "Convert JSON arrays and CSV via Papa Parse",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.json_csv",
  engine: { name: "papaparse", upstream: "https://github.com/mholt/PapaParse", version: "5.x" },
  seoKeywords: { zh: "json转csv,csv转json", en: "json to csv converter online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["json_to_csv", "csv_to_json"]).default("json_to_csv"),
    header: z.boolean().default(true),
  }),
  execute: (input: { text: string; mode?: "json_to_csv" | "csv_to_json"; header?: boolean }) => {
    const mode = input.mode ?? "json_to_csv";
    const header = input.header !== false;
    if (mode === "json_to_csv") {
      const data: unknown = JSON.parse(input.text);
      if (!Array.isArray(data)) throw new Error("JSON must be an array of objects for CSV export");
      return {
        result: Papa.unparse(data as object[], { header }),
        mode,
        rows: data.length,
        engine: "papaparse",
      };
    }
    const parsed = Papa.parse<Record<string, string>>(input.text, {
      header,
      skipEmptyLines: true,
    });
    if (parsed.errors.length) {
      throw new Error(parsed.errors.map((e) => e.message).join("; "));
    }
    return {
      result: JSON.stringify(parsed.data, null, 2),
      mode,
      rows: parsed.data.length,
      engine: "papaparse",
    };
  },
});

export const csvPreviewTool = tool({
  id: "data/csv-preview",
  slug: "csv-preview",
  category: "data",
  title: { zh: "CSV 预览", en: "CSV Preview" },
  description: { zh: "Papa Parse 解析 CSV 为表格预览", en: "Parse CSV into a table preview" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.csv_preview",
  engine: { name: "papaparse", upstream: "https://github.com/mholt/PapaParse", version: "5.x" },
  seoKeywords: { zh: "csv在线预览,csv解析", en: "csv preview online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    maxRows: z.number().int().min(1).max(500).default(50),
  }),
  execute: (input: { text: string; maxRows?: number }) => {
    const maxRows = input.maxRows ?? 50;
    const parsed = Papa.parse<string[]>(input.text, { header: false, skipEmptyLines: true });
    if (parsed.errors.length) {
      throw new Error(parsed.errors.map((e) => e.message).join("; "));
    }
    const rows = parsed.data.slice(0, maxRows);
    return {
      headers: rows[0] ?? [],
      rows: rows.slice(1),
      totalRows: Math.max(0, parsed.data.length - 1),
      previewRows: Math.max(0, rows.length - 1),
      engine: "papaparse",
    };
  },
});

export const xmlFormatTool = tool({
  id: "data/xml-format",
  slug: "xml-format",
  category: "data",
  title: { zh: "XML 格式化", en: "XML Formatter" },
  description: { zh: "fast-xml-parser 校验与美化", en: "Validate and pretty-print XML" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.xml_format",
  engine: {
    name: "fast-xml-parser",
    upstream: "https://github.com/NaturalIntelligence/fast-xml-parser",
    version: "5.x",
  },
  seoKeywords: { zh: "xml格式化,xml美化在线", en: "xml formatter beautify online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["format", "minify", "validate"]).default("format"),
    indent: z.number().int().min(0).max(8).default(2),
  }),
  execute: (input: { text: string; mode?: "format" | "minify" | "validate"; indent?: number }) => {
    const mode = input.mode ?? "format";
    const validation = XMLValidator.validate(input.text);
    if (validation !== true) {
      throw new Error(
        typeof validation === "object" && "err" in validation
          ? `${validation.err.msg} (line ${validation.err.line})`
          : "Invalid XML",
      );
    }
    if (mode === "validate") {
      return { valid: true, result: input.text, mode, engine: "fast-xml-parser" };
    }
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      commentPropName: "#comment",
    });
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      preserveOrder: true,
      commentPropName: "#comment",
      format: mode === "format",
      indentBy: " ".repeat(input.indent ?? 2),
      suppressEmptyNode: false,
    });
    const obj = parser.parse(input.text);
    return {
      valid: true,
      result: builder.build(obj),
      mode,
      engine: "fast-xml-parser",
    };
  },
});

export const jsonPathTool = tool({
  id: "data/json-path",
  slug: "json-path",
  category: "data",
  title: { zh: "JSON Path 查询", en: "JSONPath Query" },
  description: { zh: "jsonpath-plus 查询 JSON", en: "Query JSON with JSONPath expressions" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.json_path",
  engine: {
    name: "jsonpath-plus",
    upstream: "https://github.com/JSONPath-Plus/JSONPath",
    version: "10.x",
  },
  seoKeywords: { zh: "jsonpath在线,json路径查询", en: "jsonpath online tester" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    path: z.string().default("$"),
  }),
  execute: (input: { text: string; path?: string }) => {
    const data: unknown = JSON.parse(input.text);
    const path = input.path ?? "$";
    const matches = JSONPath({ path, json: data as object, wrap: true }) as unknown[];
    return {
      result: JSON.stringify(matches, null, 2),
      count: matches.length,
      path,
      engine: "jsonpath-plus",
    };
  },
});

export const dataFormatTools: readonly AnyForgeToolDefinition[] = [
  jsonYamlTool,
  jsonTomlTool,
  jsonCsvTool,
  csvPreviewTool,
  xmlFormatTool,
  jsonPathTool,
];
