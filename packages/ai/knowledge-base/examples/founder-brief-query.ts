import { KnowledgeBase } from "../src";

const kb = await KnowledgeBase.open(".nebutra/examples/knowledge-base", {
  tenantId: "tenant_demo",
});

try {
  await kb.remember({
    id: "alice_pricing",
    kind: "episodic",
    actor: "Alice",
    action: "recommended lowering starter pricing",
    outcome: "founder friendly launch offer",
  });

  await kb.remember({
    id: "daily_brief_style",
    kind: "procedural",
    skill: "daily_brief",
    successRate: 0.9,
    learnedVariations: ["start with metrics", "keep audio under five minutes"],
  });

  const brief = await kb.ask("What should today mention about pricing?");
  process.stdout.write(`${brief.answer}\n`);
} finally {
  await kb.close();
}
