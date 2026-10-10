/** Agent tool catalog, read by running the pinned chart's own registrations (extract-agent-tools.ts). */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { APP_ROOT } from "./source.mjs";

const CORE_ALIASES = {
  "@/core/*": ["packages/core/src/engine/*"],
  "@/engine/*": ["packages/core/src/engine/*"],
  "@/types/*": ["packages/core/src/foundation/types/*"],
  "@/plugin": ["packages/core/src/foundation/plugin"],
  "@/utils/*": ["packages/core/src/foundation/utils/*"],
  "@/*": ["packages/core/src/*"],
  // One registry instance: the code interpreter registers through the package entry.
  "@363045841yyt/klinechart-core/agent-tools": [
    "packages/core/src/foundation/agent/chartToolRegistry.ts",
  ],
};

export function readAgentTools(source) {
  const dir = resolve(APP_ROOT, ".generated");
  mkdirSync(dir, { recursive: true });
  const tsconfig = resolve(dir, "agent-tools.tsconfig.json");
  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        baseUrl: source,
        paths: CORE_ALIASES,
      },
    }),
  );
  const tsx = createRequire(import.meta.url).resolve("tsx/cli");
  const result = spawnSync(
    process.execPath,
    [tsx, "--tsconfig", tsconfig, resolve(APP_ROOT, "scripts/extract-agent-tools.ts"), source],
    {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    },
  );
  if (result.status !== 0) {
    throw new Error(`Agent tool extraction failed:\n${result.stderr}`);
  }
  const tools = JSON.parse(result.stdout.trim().split("\n").at(-1));
  if (!Array.isArray(tools) || tools.length === 0) throw new Error("No agent tools registered.");
  for (const tool of tools) {
    if (tool.safety !== "read-only" && tool.safety !== "destructive")
      throw new Error(`Tool ${tool.name} declares no safety level.`);
  }
  const files = ["packages/core/src", "packages/agent-runtime/src"].flatMap((dir) =>
    sourceFiles(resolve(source, dir)),
  );
  for (const tool of tools) {
    const found = locate(files, tool.name);
    if (!found) throw new Error(`Cannot find the declaration of tool ${tool.name}`);
    tool.source = relative(source, found.file);
    tool.line = found.line;
  }
  return tools;
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" || entry.name === "node_modules" ? [] : sourceFiles(path);
    return /\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name) ? [path] : [];
  });
}

/** The line that names the tool: `name: 'x'` in a decorator, or a `*_TOOL_NAME = 'x'` constant. */
function locate(files, name) {
  const patterns = [`name: '${name}'`, `_TOOL_NAME = '${name}'`];
  for (const pattern of patterns) {
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      const index = lines.findIndex((line) => line.includes(pattern));
      if (index >= 0) return { file, line: index + 1 };
    }
  }
  return null;
}

/** Tool groups for the reference pages; every tool must land in exactly one. */
export const TOOL_GROUPS = [
  { id: "panes", match: (n) => /^panes?_/.test(n) },
  { id: "drawings", match: (n) => /^drawings?_/.test(n) },
  { id: "comparisons", match: (n) => /^comparisons?_/.test(n) },
  { id: "settings", match: (n) => /^settings_/.test(n) },
  { id: "market-data", match: (n) => /^(market_|instruments_)/.test(n) },
  { id: "indicators", match: (n) => /^indicators?_/.test(n) },
  { id: "conversation", match: (n) => n === "ask_user" || n === "web_search" },
  { id: "code-interpreter", match: (n) => n === "code_interpreter" },
];

export function groupTools(tools) {
  const groups = TOOL_GROUPS.map((group) => ({
    ...group,
    tools: tools.filter((tool) => group.match(tool.name)),
  }));
  const placed = new Set(groups.flatMap((g) => g.tools.map((t) => t.name)));
  const orphans = tools.filter((t) => !placed.has(t.name)).map((t) => t.name);
  if (orphans.length)
    throw new Error(`Agent tools without a reference group: ${orphans.join(", ")}`);
  return groups.filter((g) => g.tools.length > 0);
}

/** Flatten a JSON Schema into rows: dotted path, type, required, constraints, description. */
export function schemaRows(schema, prefix = "", depth = 0, parentRequired = true) {
  const rows = [];
  const required = new Set(schema.required ?? []);
  for (const [key, value] of Object.entries(schema.properties ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isRequired = parentRequired && required.has(key);
    rows.push({
      path,
      type: typeLabel(value),
      required: isRequired,
      constraints: constraints(value),
      description: value.description ?? "",
    });
    if (depth >= 2) continue;
    if (value.type === "object" && value.properties) {
      rows.push(...schemaRows(value, path, depth + 1, isRequired));
    } else if (value.type === "array" && value.items?.type === "object" && value.items.properties) {
      rows.push(...schemaRows(value.items, `${path}[]`, depth + 1, isRequired));
    } else if (value.type === "object" && value.patternProperties) {
      const [pattern, inner] = Object.entries(value.patternProperties)[0];
      if (inner?.type === "object" && inner.properties) {
        rows.push(...schemaRows(inner, `${path}.<${keyName(pattern)}>`, depth + 1, false));
      }
    }
  }
  return rows;
}

function keyName(pattern) {
  return /\\d/.test(pattern) ? "n" : "key";
}

export function typeLabel(schema) {
  if (schema.enum) return "enum";
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.anyOf) {
    const consts = schema.anyOf.filter((s) => s.const !== undefined);
    if (consts.length === schema.anyOf.length) return "enum";
    return schema.anyOf.map(typeLabel).join(" | ");
  }
  if (schema.type === "array") return `${schema.items ? typeLabel(schema.items) : "unknown"}[]`;
  if (schema.type === "object" && schema.patternProperties && !schema.properties) return "record";
  return schema.type ?? "unknown";
}

export function enumValues(schema) {
  if (schema.enum) return schema.enum;
  if (schema.anyOf?.every((s) => s.const !== undefined)) return schema.anyOf.map((s) => s.const);
  if (schema.type === "array" && schema.items) return enumValues(schema.items);
  return null;
}

function constraints(schema) {
  const out = [];
  const values = enumValues(schema);
  if (values) out.push({ kind: "one of", value: values.map((v) => JSON.stringify(v)).join(", ") });
  const pairs = [
    ["minLength", "min length"],
    ["maxLength", "max length"],
    ["minimum", "≥"],
    ["maximum", "≤"],
    ["exclusiveMinimum", ">"],
    ["exclusiveMaximum", "<"],
    ["minItems", "min items"],
    ["maxItems", "max items"],
    ["pattern", "pattern"],
  ];
  for (const [key, label] of pairs) {
    if (schema[key] !== undefined) out.push({ kind: label, value: String(schema[key]) });
  }
  const items = schema.type === "array" ? schema.items : null;
  if (items && !enumValues(items)) {
    for (const [key, label] of pairs) {
      if (items[key] !== undefined) out.push({ kind: `item ${label}`, value: String(items[key]) });
    }
  }
  if (schema.additionalProperties === false) out.push({ kind: "closed", value: "" });
  return out;
}

/** A minimal input made only of required fields, with schema-derived placeholders. */
export function minimalInput(schema) {
  const out = {};
  for (const key of schema.required ?? []) {
    out[key] = placeholder(key, schema.properties?.[key] ?? {});
  }
  return out;
}

function placeholder(key, schema) {
  const values = enumValues(schema);
  if (values && schema.type !== "array") return values[0];
  if (schema.type === "integer") return schema.minimum ?? 1;
  if (schema.type === "number") return schema.minimum ?? 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "array") {
    const item = schema.items ?? {};
    const count = Math.max(1, schema.minItems ?? 1);
    return Array.from({ length: Math.min(count, 2) }, () =>
      placeholder(key.replace(/s$/, ""), item),
    );
  }
  if (schema.type === "object") {
    if (schema.properties) return minimalInput(schema);
    return {};
  }
  if (schema.pattern === "^\\d{4}-\\d{2}-\\d{2}$") return "YYYY-MM-DD";
  return `<${key}>`;
}
