/**
 * Example 03 — Custom pipeline wiring + doctor() health report.
 *
 * Swaps in a custom chunker and a lexical reranker, runs a query, then prints
 * the structured doctor() report (completes in < 3s).
 *
 *   pnpm --filter @nebutra/knowledge-rag exec tsx examples/03-custom-pipeline-and-doctor.ts
 */

import { RecursiveCharChunker } from "../src/chunker";
import { createKnowledgeRag } from "../src/pipeline";
import { LexicalOverlapReranker } from "../src/reranker";
import { InMemoryVectorStore } from "../src/stores/memory";

async function main() {
  const kb = createKnowledgeRag({
    chunker: new RecursiveCharChunker({ size: 120, overlap: 24 }),
    reranker: new LexicalOverlapReranker(0.4),
    vectorStore: new InMemoryVectorStore(),
    vectorWeight: 0.55,
    disableKeyword: true,
  });

  await kb.ingest({
    id: "guide",
    tenantId: "org_acme",
    text: `Chapter 1: ingestion splits documents into overlapping chunks.
            Chapter 2: each chunk is embedded into a vector.
            Chapter 3: retrieval blends vector and keyword signals.
            Chapter 4: an optional reranker reorders the final list.`,
    meta: { source: "internal-guide", version: 2 },
  });

  const hits = await kb.query({
    query: "what does the reranker do?",
    tenantId: "org_acme",
    topK: 2,
  });
  for (const h of hits) {
    process.stdout.write(
      `[${h.score.toFixed(3)}] v=${h.scores.vector.toFixed(2)} k=${h.scores.keyword.toFixed(2)} :: ${h.chunk.text.trim()}\n`,
    );
  }

  const report = await kb.doctor();
  process.stdout.write(`\ndoctor: ok=${report.ok} (${report.durationMs}ms)\n`);
  for (const c of report.components) {
    process.stdout.write(`  - ${c.name}: ${c.ok ? "OK" : "FAIL"} — ${c.detail}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\nFix: ${e.suggestion ?? "n/a"}\n`);
  process.exit(1);
});
