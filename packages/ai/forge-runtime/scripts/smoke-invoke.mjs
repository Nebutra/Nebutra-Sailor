/**
 * Smoke consumer for shipped forge-runtime entry points (not a reimplementation).
 * Run: pnpm --filter @nebutra/forge-runtime exec node scripts/smoke-invoke.mjs
 */
import { createForgeMcpHandlers, ForgeRegistry, invokeTool } from "../src/index.ts";

function log(...parts) {
  process.stdout.write(`${parts.map(String).join(" ")}\n`);
}

async function main() {
  const reg = ForgeRegistry.openDefault();
  const tools = reg.list();
  log("TOOL_COUNT", tools.length);
  log(
    "SAMPLE_ROOTS",
    tools
      .slice(0, 5)
      .map((t) => `${t.slug}:${(t.roots ?? []).join("|")}`)
      .join(","),
  );

  const wc = await invokeTool(reg, {
    toolId: "text/word-count",
    input: { text: "hello world" },
  });
  log("WORD_COUNT_OK", wc.ok, wc.ok ? wc.output?.words : wc);

  const df = await invokeTool(reg, {
    toolId: "text/diff",
    input: { left: "a\nb", right: "a\nc" },
  });
  log("DIFF_OK", df.ok, df.ok ? df.output?.engine : df);

  const jf = await invokeTool(reg, {
    toolId: "data/json-format",
    input: { text: '{"a":1}' },
  });
  log("JSON_OK", jf.ok);

  const mcp = createForgeMcpHandlers(reg);
  const names = mcp.listTools().map((t) => t.name);
  log("MCP_WORD", names.includes("text__word-count"));
  log("MCP_COUNT", names.length);

  if (tools.length < 25) process.exit(2);
  if (!wc.ok || !df.ok || !jf.ok) process.exit(3);
  if (!names.includes("text__word-count")) process.exit(4);
  log("SMOKE_OK");
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
