import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "@nebutra/content-store";
import { afterEach, describe, expect, it } from "vitest";
import {
  type ConnectorRecord,
  type ConnectorSyncPort,
  KnowledgeBase,
  readKnowledgeBaseDebug,
} from "./index";

let root: string | undefined;
let kb: KnowledgeBase | undefined;

afterEach(async () => {
  if (kb) await kb.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  kb = undefined;
});

async function open(tenantId = "tenant_a", connector?: ConnectorSyncPort): Promise<KnowledgeBase> {
  root = await mkdtemp(join(tmpdir(), "knowledge-base-"));
  const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
  kb = new KnowledgeBase({
    tenantId,
    root,
    debugRoot: root,
    contentStore,
    ...(connector !== undefined ? { connector } : {}),
  });
  return kb;
}

describe("KnowledgeBase", () => {
  it("ingests through document-pipeline and searches through knowledge-rag without owning RAG primitives", async () => {
    const base = await open("tenant_a");
    await base.ingest({
      path: "company/BRAND.md",
      content: "Loop helps indie developers debug production issues. Alice disliked pricing.",
      metadata: { source: "note" },
    });

    const result = await base.search({ text: "pricing Alice", topK: 5 });

    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]).toMatchObject({
      docId: "company/BRAND.md",
      sourcePath: "company/BRAND.md",
    });
    expect(await base.entityByName("Alice")).toMatchObject({ name: "Alice" });
  });

  it("requires tenant context before persistent operations", async () => {
    root = await mkdtemp(join(tmpdir(), "knowledge-base-"));
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId: "tenant_a" });
    kb = new KnowledgeBase({ contentStore, root, debugRoot: root });

    await expect(kb.ingest({ path: "a.md", content: "hello" })).rejects.toMatchObject({
      capability: "knowledge-base",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("keeps memories tenant-scoped and classifies all four memory kinds", async () => {
    const base = await open("tenant_a");
    await base.remember({
      id: "event_1",
      kind: "episodic",
      actor: "Alice",
      action: "said pricing was too high",
      outcome: "lowered starter tier",
    });
    await base.remember({
      id: "semantic_1",
      kind: "semantic",
      entity: "Loop",
      attribute: "target_customer",
      value: "indie developers",
      confidence: 0.9,
    });
    await base.remember({
      id: "procedure_1",
      kind: "procedural",
      skill: "daily_brief",
      successRate: 0.8,
      learnedVariations: ["short audio first"],
    });
    await base.remember({
      id: "working_1",
      kind: "working",
      threadId: "thread_1",
      items: ["waiting on video render"],
    });

    await expect(base.stats()).resolves.toMatchObject({
      memories: { episodic: 1, semantic: 1, procedural: 1, working: 1 },
    });
    await expect(base.episodicTimeline("Alice")).resolves.toHaveLength(1);
    await expect(base.search({ text: "starter tier" })).resolves.toMatchObject({
      memories: [expect.objectContaining({ kind: "episodic" })],
    });
  });

  it("syncs connectors through an injected port and records debug state", async () => {
    const connector: ConnectorSyncPort = {
      async sync(config: ConnectorRecord) {
        return [
          {
            id: `${config.id}:doc`,
            path: `connectors/${config.app}/pricing.md`,
            content: "Alice said MRR target should stay founder friendly.",
            metadata: { source_id: config.id },
          },
        ];
      },
      async doctor() {
        return { ok: true, detail: "fake connector ok" };
      },
    };
    const base = await open("tenant_a", connector);
    await base.addConnector({
      id: "notes",
      app: "docs",
      action: "list_documents",
      syncStrategy: { type: "polling", intervalMinutes: 30 },
    });

    await expect(base.syncConnector("notes")).resolves.toMatchObject({
      status: "ready",
      documentCount: 1,
    });
    await expect(base.search({ text: "MRR founder" })).resolves.toMatchObject({
      citations: [expect.objectContaining({ sourcePath: "connectors/docs/pricing.md" })],
    });
    await expect(readKnowledgeBaseDebug(root)).resolves.toEqual(expect.any(Array));
  });

  it("explains the retrieval path and reports doctor health", async () => {
    const base = await open("tenant_a");
    await base.ingest({ path: "daily/brief.md", content: "Daily brief mentions churn risk." });

    await expect(base.explain({ text: "churn" })).resolves.toMatchObject({
      path: ["knowledge-rag", "content-store", "memory", "entity-graph", "citation"],
    });
    await expect(base.doctor()).resolves.toMatchObject({
      capability: "knowledge-base",
      ok: true,
    });
  });

  it("treats an empty zero-config knowledge base as ready but empty", async () => {
    const base = await open("tenant_a");

    await expect(base.doctor()).resolves.toMatchObject({
      capability: "knowledge-base",
      ok: true,
      contentStore: { indexed: 0 },
      suggestion: expect.stringContaining("ready but empty"),
    });
  });
});
