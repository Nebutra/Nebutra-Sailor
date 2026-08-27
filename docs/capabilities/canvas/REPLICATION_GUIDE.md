# Replication Guide — build an AI-canvas product form on Sailor

Audience: an engineer who has never seen this codebase and wants the same
product shape (node canvas + RAG + live collab) running fast. Every block is
zero-config by default.

## 1. Interactive node canvas (5-minute quickstart)

```tsx
"use client";
import { useState } from "react";
import type { ReelGraph } from "@nebutra/reel";
import { NodeGraphCanvas } from "@nebutra/ui/components";

const seed: ReelGraph = {
  id: "g1", tenantId: "org_1", name: "Demo",
  nodes: [
    { id: "a", type: "text",      x: 0,   y: 0, settings: {} },
    { id: "b", type: "gen-image", x: 260, y: 0, settings: {} },
  ],
  edges: [{ from: "a", to: "b", inputType: "prompt" }],
  updatedAt: new Date(),
};

export function MyCanvas() {
  const [graph, setGraph] = useState(seed);
  return <NodeGraphCanvas graph={graph} onChange={setGraph} />;
}
```

Drag, pan/zoom, connect (cycles auto-rejected), delete. The component is
controlled and never mutates `graph` — `onChange` always gets a fresh
immutable `ReelGraph`. Model lives in `@nebutra/reel`; the editor adds no
new data model.

## 2. Knowledge RAG (zero-config, real results)

```ts
import { getKnowledgeRag } from "@nebutra/knowledge-rag";

const kb = await getKnowledgeRag();                       // in-memory + local embedder, no env
await kb.ingest({ id: "doc1", text: "...", tenantId: "org_1" });
const hits = await kb.query({ query: "...", tenantId: "org_1", topK: 5 });
```

`await kb.doctor()` → health report in <3 s. Swap in pgvector + provider
embeddings via config; tenant isolation is enforced at the store layer.

## 3. Real-time collaboration (CRDT)

```ts
import { getCollab } from "@nebutra/collab";

const hub = await getCollab();                            // in-memory + loopback, no env
const room = hub.room("org_1", "graph-g1");               // tenant-partitioned Y.Doc
const off = room.onUpdate((u) => peer.applyUpdate(u));
await room.snapshot();                                    // persists, serialized per (tenant,room)
```

Two clients exchanging updates converge (CRDT). `room("org_1",…)` and
`room("org_2",…)` are unreachable from each other.

## 4. Wire it together

- Persist the canvas graph through reel's tenant-scoped store; serialize
  writes with `withTenantLock` from `@nebutra/tenant-store`.
- Bind a `collab` room to the canvas for multi-user editing; broadcast via
  the `CollabTransport` seam (Pusher/WS adapter — interface documented in the
  package README).
- Generate graphs from natural language with an `@nebutra/agent-runtime`
  skill that emits a `ReelGraph` (WRAP, not a new orchestrator).

## 5. Try the demo

Set the feature flag `canvas-demo` on for your tenant, then open
`/<locale>/demo/canvas` in `apps/web`. Off by default.
