# Replicating a node-graph + storyboard generation studio with Sailor

This guide shows how to build a "script → shots → typed node graph of
generated media" studio on Sailor, multi-tenant from line one, with no AI key
needed to see it work. No prior knowledge of this codebase is assumed beyond
Sailor's package layout.

Target shape: a user pastes a script; it splits into shots; each shot becomes a
typed node whose generated output flows to downstream nodes through one
versioned contract; the server owns placement, persistence, and consistency.

The whole capability is four small pieces. Build them in order.

---

## 0. Mental model

Sailor already gives you tenancy, auth, persistence, queues, realtime, feature
flags, a generation modality, and the atelier-canvas consistency primitives.
You are **not** building a workflow engine, a provider framework, or an
orchestrator — you are adding one typed dataflow contract, one transport layer,
and one storyboard pipeline, then reusing everything else.

Two non-obvious invariants, both inherited:

- **Persist, then return/broadcast.** A client that misses the realtime event
  must recover identical state on reload. `applyNodeOutput` enforces this under
  the canvas lock.
- **The envelope is the only thing nodes agree on.** Any node can hand output
  to any node because the payload is a versioned, type-erased
  `NODE_IO_ENVELOPE`. Never let a consumer branch on the producer's type.

---

## 1. The typed graph (`@nebutra/reel`)

A graph is `nodes + edges`, every node carries an optional output envelope.

```ts
import {
  buildEnvelope, resolveNodeInputs, applyNodeOutput,
  InMemoryReelGraphStore,
} from "@nebutra/reel";

const store = new InMemoryReelGraphStore(); // Prisma adapter in prod (step 4)

// A node produces an envelope; persisted under the lock before it returns.
const env = buildEnvelope({
  sourceNodeId: "gen-0", sourceNodeType: "gen-image",
  inputType: "default", media: [{ type: "image", url }],
});
await applyNodeOutput(store, tenantId, graphId, "gen-0", env);

// A downstream node pulls its inputs on demand — no scheduler needed.
const inputs = resolveNodeInputs(graph, "analyze-1"); // Map<inputType, envelope>
```

Don't add a topological executor: the source product never had one, and
pull-based resolution is the correct model for an interactive studio.

---

## 2. The transport layer (`@nebutra/reel/transport`)

One call, three transports, gated by a per-model capability schema and a
pre-flight validator that rejects mismatches *before* a request is sent.

```ts
import { validateTransportContract, executeTransport } from "@nebutra/reel/transport";

const issues = validateTransportContract(modelEntry); // [] = safe to run
const r = await executeTransport(
  { url, body }, modelEntry.transport, modelEntry.transportOptions,
  { fetchImpl }, // injected — deterministic in tests, global fetch in prod
);
```

`ws-stream` needs an injected `wsFactory`; everything is dependency-injected so
nothing implicitly hits the network.

---

## 3. The storyboard pipeline (`@nebutra/reel/storyboard`)

Split a script into shots; the split prompts and the output contract are the
IP. The completion call is injected so the package is LLM-runtime-agnostic.

```ts
import { splitScriptIntoShots } from "@nebutra/reel/storyboard";

const shots = await splitScriptIntoShots(script, complete, { mode: "script" });
// `complete(system, user) => Promise<string>`: wire to @nebutra/agents
// generateText in prod; a deterministic stub in tests/demo.
```

Keep `isSameShotId` and the `storyboard[-img]-{node}-shot-{shot}` source-id
scheme intact — they are why concurrent batch generation never bleeds one
shot's reference images into another.

---

## 4. Productionize

| Demo choice | Production swap | Touches |
|---|---|---|
| `InMemoryReelGraphStore` | a Prisma `ReelGraphStore` (one JSON blob + organization_id, RLS) | one class |
| Keyless line-splitter `complete` | `@nebutra/agents` generateText as `complete` | one function |
| Mock generation provider | register a real provider (`@nebutra/agents/generation`) | env only |
| Graph returned in HTTP response | `broadcastToTenant` after `applyNodeOutput` | app layer |
| Thin coordinate renderer | a real graph editor reading the same node coords | client only |

---

## 5. Turn it on

Ships behind `FLAGS.REEL_STUDIO`, **off by default**. Enable per tenant via the
flag store or globally with `KILL_SWITCH_REEL_STUDIO=true`. `/reel`
`notFound()`s while disabled, so nothing leaks until you opt in.

---

## What you did NOT have to build

Tenancy, RLS, auth, generation, the per-resource lock, persist-then-broadcast,
queues, realtime transport, feature gating, the web shell. The product form is
~1.6k lines of new capability on top of existing infrastructure. The original
was 39.8k lines in one file because it re-implemented all of that per-browser;
on Sailor it is three focused packages and a flag-gated route.
