/**
 * Example 01 — Zero-config ingest → query roundtrip.
 *
 * NO env vars, NO external services. In-memory vector store + deterministic
 * local hash embedder. Run with:
 *
 *   pnpm --filter @nebutra/knowledge-rag exec tsx examples/01-zero-config.ts
 */
import { getKnowledgeRag } from "../src/index";

async function main() {
  const kb = await getKnowledgeRag();

  await kb.ingest({
    id: "handbook",
    tenantId: "org_acme",
    text: `Nebutra Sailor is a multi-tenant SaaS starter kit.
            It ships authentication, billing, and a hybrid RAG knowledge base.
            Retrieval blends vector similarity with keyword search.`,
  });

  const hits = await kb.query({
    query: "how does retrieval work?",
    tenantId: "org_acme",
    topK: 3,
  });

  for (const h of hits) {
    process.stdout.write(`[${h.score.toFixed(3)}] (${h.source}) ${h.chunk.text.trim()}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\nFix: ${e.suggestion ?? "n/a"}\n`);
  process.exit(1);
});
