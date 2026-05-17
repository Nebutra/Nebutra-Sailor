/**
 * knowledge-rag CLI — `doctor` (dependency health) and `debug <query>`
 * (run the real zero-config pipeline and print the ranked breakdown).
 * Mirrors the Sailor capability-CLI convention (see trace-store/src/cli.ts).
 */

import { doctor, getKnowledgeRag } from "./index";

const command = process.argv[2] ?? "doctor";

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "knowledge-rag", ...(await doctor()) }, null, 2)}\n`,
  );
} else if (command === "debug") {
  const query = process.argv[3] ?? "what is the canvas capability";
  const tenantId = "debug-tenant";
  const kb = await getKnowledgeRag();
  await kb.ingest({
    id: "debug-doc",
    tenantId,
    text: "The canvas capability adds an interactive node-graph editor over the reel model, a multi-tenant hybrid RAG pipeline, and a CRDT collaboration layer.",
  });
  const hits = await kb.query({ query, tenantId, topK: 3 });
  process.stdout.write(
    `${JSON.stringify({ capability: "knowledge-rag", query, hits }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown knowledge-rag command: ${command}\n`);
  process.exitCode = 1;
}
