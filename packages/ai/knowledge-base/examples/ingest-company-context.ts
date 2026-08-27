import { KnowledgeBase } from "../src";

const kb = await KnowledgeBase.open(".nebutra/examples/knowledge-base", {
  tenantId: "tenant_demo",
});

try {
  await kb.ingest({
    path: "company/BRAND.md",
    content: "Loop helps indie developers debug production issues with calm operator language.",
    metadata: { source: "manual" },
  });

  const result = await kb.ask("Who is Loop for?");
  process.stdout.write(`${JSON.stringify(result.citations, null, 2)}\n`);
} finally {
  await kb.close();
}
