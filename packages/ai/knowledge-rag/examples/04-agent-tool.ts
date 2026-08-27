/**
 * Example 04 — Tenant-bound agent tool.
 *
 * createKnowledgeRagTool() is the "real caller" that keeps this package at
 * lifecycle tier `active`. The tenantId is bound at factory time (from the
 * agent's tenant context, e.g. getCurrentTenant() of @nebutra/tenant) and is
 * NEVER taken from model-generated tool arguments.
 *
 *   pnpm --filter @nebutra/knowledge-rag exec tsx examples/04-agent-tool.ts
 */
import { getKnowledgeRag } from "../src/index";
import { createKnowledgeRagTool } from "../src/tool";

async function main() {
  // In a real agent: const { tenantId } = getCurrentTenant();
  const tenantId = "org_acme";

  const kb = await getKnowledgeRag();
  await kb.ingest({
    id: "faq",
    tenantId,
    text: "Refunds are processed within 5 business days. Contact support to start one.",
  });

  const tool = createKnowledgeRagTool(tenantId);
  process.stdout.write(`tool: ${tool.name} — ${tool.description}\n`);

  const result = await tool.execute({ query: "how long do refunds take?", topK: 2 });
  for (const r of result.results) {
    process.stdout.write(`  [${r.score.toFixed(3)}] ${r.docId}: ${r.text}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\nFix: ${e.suggestion ?? "n/a"}\n`);
  process.exit(1);
});
