# Replicating an agentic creative canvas with Sailor

This guide shows how to build a "describe it → the agent generates it → it
lands on an infinite canvas" product on Sailor, multi-tenant from line one.
You need no prior knowledge of this codebase beyond Sailor's package layout.

Target shape: a chat brief produces generated images/video; the **server**
decides where each asset goes and persists it before the UI is told; multiple
tenants are isolated; no paid AI key is required to see it working.

The whole capability is four small pieces. Build them in order.

---

## 0. Mental model

Sailor already gives you tenancy, auth, persistence, realtime, queues, feature
flags, and an agent runtime. You are **not** building a generation framework or
an orchestrator — you are adding one *modality* and one *spatial engine*, then
wiring an agent the runtime already knows how to run.

The single non-obvious invariant: **persist, then broadcast.** The websocket is
an optimization; a client that misses it must recover the identical state on
reload. Every design choice below preserves that.

---

## 1. Generation modality (extends `@nebutra/agents`)

Sailor's agent package env-key-gates an LLM provider chain (`fallback.ts`):
providers with no key are filtered out, single-provider deploys "just work".
Image/video is the same idea, a new modality:

```ts
import { generateImage, registerGenerationProvider } from "@nebutra/agents";

// Out of the box: a deterministic mock provider (always available, no secret).
const r = await generateImage(
  { prompt: "alpine lake at dawn", width: 1024, height: 1024 },
  { tenantId, userId },
);
// r.url is a data: URI you can render immediately.
```

Add a real provider later **without touching anything else** — register it with
a non-null `envKey`; it wins over `mock` whenever its key is present, and
retryable failures rotate back down the chain:

```ts
registerGenerationProvider({
  name: "replicate",
  envKey: "REPLICATE_API_TOKEN",
  capabilities: ["image"],
  async generateImage(req, ctx) { /* call the API, return GenerationResult */ },
});
```

Why this and not a separate provider library: tenancy, fallback, and metering
already exist in `@nebutra/agents`. Reuse beats parallel.

---

## 2. Canvas engine (`@nebutra/atelier-canvas`)

This package owns the two properties a single-user editor never needs:
deterministic server placement and persist-then-broadcast consistency.

```ts
import { InMemoryCanvasStore, placeGeneratedAsset } from "@nebutra/atelier-canvas";

const store = new InMemoryCanvasStore(); // swap for Prisma in prod (step 4)

const { patch } = await placeGeneratedAsset(store, tenantId, "canvas-1", {
  modality: "image",
  mimeType: r.mimeType,
  url: r.url,
  width: r.width,
  height: r.height,
});
// `patch` is durable BEFORE you get it. Now broadcast it.
```

`placeGeneratedAsset` runs under a per-`(tenant,canvas)` lock, computes a
non-overlapping position server-side, appends to the scene, and **saves before
returning**. Concurrent generations never stack; reload always matches realtime.

---

## 3. The agent (`@nebutra/atelier-canvas/agent`)

The agent is data, not a runtime: a prompt strategy + one tool + an
`AgentConfig` the Sailor agent runtime consumes.

```ts
import { createAtelierAgent } from "@nebutra/atelier-canvas/agent";

const agent = createAtelierAgent({
  store,
  onPlaced: (patch) => broadcastToTenant(tenantId, "atelier:placed", patch),
});
// Feed `agent` to @nebutra/agents (BaseAgent / orchestrator) with a provider
// key to get the full plan→generate loop. Without a key, drive the tool
// directly — generation falls back to the mock provider.
```

The prompt encodes the parts that make multi-asset output reliable: author a
Design Strategy before generating, treat a stated quantity as a contract,
generate >10 assets in bounded batches, parse `<input_images>` references.

---

## 4. Productionize

| Demo choice | Production swap | Touches |
|---|---|---|
| `InMemoryCanvasStore` | `new PrismaCanvasStore((t) => getTenantDb(t) as unknown as TenantDbLike)` | one line; RLS does isolation |
| Patch returned in HTTP response | `onPlaced` → `broadcastToTenant`; client applies from the pusher channel | app layer only |
| Mock provider | `registerGenerationProvider({ envKey: "..." })` + set the env | no engine change |
| Tool driven directly | `BaseAgent` with the `AgentConfig` + a provider key | app layer only |
| Thin coordinate renderer | Excalidraw (or any canvas) reading the same element coords | client only |

The `AtelierCanvas` Prisma model is already in the schema (one JSON scene blob
+ `organization_id`). Run the migration, point the store at Prisma, done.

---

## 5. Turn it on

It ships behind `FLAGS.ATELIER_CANVAS`, **off by default**. Enable per tenant
via the flag store, or globally with `KILL_SWITCH_ATELIER_CANVAS=true`. The
`/atelier` route `notFound()`s while disabled, so nothing leaks until you opt in.

---

## What you did NOT have to build

Tenancy, RLS, auth, the agent tool-loop, provider fallback, metering hooks,
realtime transport, feature gating, the web app shell. That is the point — the
product form is ~700 lines of new capability on top of existing infrastructure.
If a piece felt like it needed a parallel framework, the answer was to extend a
Sailor primitive instead.
