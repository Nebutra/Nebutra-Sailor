/**
 * Example 02 — Tenant isolation.
 *
 * Demonstrates that a query scoped to one tenant NEVER returns another
 * tenant's chunks, even when the text is identical. Multi-tenancy is
 * non-negotiable: every persisted record carries a tenantId.
 *
 *   pnpm --filter @nebutra/knowledge-rag exec tsx examples/02-tenant-isolation.ts
 */
import { getKnowledgeRag } from "../src/index";

async function main() {
  const kb = await getKnowledgeRag();

  await kb.ingest({
    id: "roadmap",
    tenantId: "org_a",
    text: "Confidential: org A launches Project Aurora in Q3.",
  });
  await kb.ingest({
    id: "roadmap",
    tenantId: "org_b",
    text: "Confidential: org B launches Project Borealis in Q4.",
  });

  const asA = await kb.query({
    query: "confidential launch project",
    tenantId: "org_a",
    topK: 10,
  });
  const leaked = asA.filter((h) => h.chunk.tenantId !== "org_a");

  process.stdout.write(`org_a sees ${asA.length} chunk(s)\n`);
  process.stdout.write(`cross-tenant leakage: ${leaked.length} (must be 0)\n`);
  process.stdout.write(`top result: ${asA[0]?.chunk.text}\n`);

  if (leaked.length > 0) {
    throw new Error("TENANT LEAK DETECTED");
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\nFix: ${e.suggestion ?? "n/a"}\n`);
  process.exit(1);
});
