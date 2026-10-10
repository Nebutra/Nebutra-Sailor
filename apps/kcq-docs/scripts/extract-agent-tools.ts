/**
 * Runs inside the pinned KCQ checkout (via tsx, with the chart's own path aliases) and prints the
 * agent tool catalog as JSON: exactly what BrowserToolRegistry hands the model. Importing the
 * modules performs their `@Tool` registrations; nothing here restates a tool by hand.
 *
 * Usage: tsx --tsconfig <generated tsconfig> extract-agent-tools.ts <kcq source dir>
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Schema = Record<string, unknown>;
interface ToolRecord {
  name: string;
  label: string;
  description: string;
  safety: "read-only" | "destructive";
  executionMode?: string;
  parameters: Schema;
  origin: "core" | "runtime" | "opt-in";
}

const root = process.argv[2];
if (!root) throw new Error("Pass the KCQ source directory.");
const load = (file: string) => import(pathToFileURL(resolve(root, file)).href);

const AGENT_FILE = "packages/core/src/features/agent/impl/chartAgentController.ts";
const REGISTRY_FILE = "packages/core/src/foundation/agent/chartToolRegistry.ts";
const INTERPRETER_FILE = "packages/agent-runtime/src/tools/code-interpreter/tool.ts";
const ASK_FILE = "packages/agent-runtime/src/tools/ask-user-tool.ts";
const SEARCH_FILE = "packages/agent-runtime/src/search/impl/web-search-tool.ts";

await load(AGENT_FILE);
const registry = await load(REGISTRY_FILE);
const coreNames = new Set<string>();
const tools: ToolRecord[] = [];
for (const tool of registry.getRegisteredChartTools()) {
  coreNames.add(tool.config.name);
  tools.push({ ...plain(tool.config), origin: "core" });
}

// Runtime tools the browser registry adds after the chart's own (browser-tool-registry.ts).
const search = await load(SEARCH_FILE);
const ask = await load(ASK_FILE);
for (const definition of [
  search.createWebSearchTool(undefined),
  ask.createAskUserTool({ request: async () => ({}) }),
]) {
  tools.push({ ...plain(definition), origin: "runtime" });
}

// The code interpreter registers into the same registry only when a host imports it.
await load(INTERPRETER_FILE);
for (const tool of registry.getRegisteredChartTools()) {
  if (coreNames.has(tool.config.name)) continue;
  tools.push({ ...plain(tool.config), origin: "opt-in" });
}

function plain(config: Record<string, unknown>) {
  return {
    name: String(config.name),
    label: String(config.label),
    description: String(config.description),
    safety: config.safety as ToolRecord["safety"],
    ...(config.executionMode ? { executionMode: String(config.executionMode) } : {}),
    parameters: JSON.parse(JSON.stringify(config.parameters)) as Schema,
  };
}

process.stdout.write(`${JSON.stringify(tools)}\n`);
