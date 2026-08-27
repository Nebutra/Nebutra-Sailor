# Replicate knowledge-base

```ts
import { KnowledgeBase } from "@nebutra/knowledge-base";

const kb = await KnowledgeBase.open(".nebutra/knowledge-base", {
  tenantId: "tenant_demo",
});

await kb.ingest({
  path: "company/BRAND.md",
  content: "Loop helps indie developers debug production issues.",
});

await kb.remember({
  id: "pricing_call",
  kind: "episodic",
  actor: "Alice",
  action: "said starter pricing should stay founder friendly",
});

const answer = await kb.ask("What do we know about pricing?");
console.log(answer.answer);
console.log(answer.citations);

await kb.close();
```

## Steps

1. Open `KnowledgeBase` with a tenant id.
2. Ingest company files or connector documents.
3. Add memories when events, facts, procedures, or live thread context matter.
4. Query with `ask()` or inspect ranking with `explain()`.
5. Run `pnpm kb:doctor` and `pnpm kb:debug` when wiring a new source.

## Commands

```bash
pnpm kb:doctor
pnpm kb:debug
pnpm kb:stats
pnpm kb:explain "pricing decision"
pnpm kb:sync <connector>
```
