# Processor root / J surface: the batch-queue archetype

**Root:** Processor (§6.7.9, empty root #3 — "not a keyword play, a *shape*")
**Status:** design only, nothing built. This brief exists so file-type-detect,
line-ending-detect, secret-scan, language-detect, vin, ean-upc-gtin and isbn
can stop deferring to a surface that had no design.

This is not a tool brief for a single blade. It is the shared journey and
contract that those seven tools (and future ones) plug into. Per §6.5 gate 11
it still needs a real teardown before anything ships on it — done below,
against real bulk products, not the fantasy of one.

## 1. What already exists (read first, built against, not invented)

Files read: `apps/forge/src/app/api/v1/jobs/route.ts`,
`.../jobs/[jobId]/route.ts`, `.../jobs/worker/route.ts`,
`packages/ai/forge-runtime/src/jobs.ts`, `.../job-dispatch.ts`.

**Usable today, unchanged:**

| Piece | What it gives the batch surface |
|---|---|
| `ForgeJobStore` (Memory + Upstash Redis REST) | A working per-item ledger: `create` / `get` / `markRunning` / `complete` / `fail`, 24h TTL on the Redis path. Exactly the state machine a batch *item* needs. Multi-instance safe already (Upstash path). |
| `resolveJobDispatchMode` / `dispatchJob` (`job-dispatch.ts`) | inline / http / qstash dispatch, already generic over `{ jobId, toolId, input }`. A batch item is just one more `{ jobId, toolId, input }` — no new dispatch code needed. |
| `POST /api/v1/jobs` | The exact per-item creation path: `store.create(toolId)` → `markRunning` → dispatch. A batch is N calls to this shape, not a new engine. |
| `GET /api/v1/jobs/:jobId` | Already the correct per-item detail-fetch contract. Reused verbatim as the per-item read path for a batch. |
| `POST /api/v1/jobs/worker` | Already isolates failure per job: one `try/catch` around `invokeTool`, one job marked failed, no shared promise chain with any other job. This is the failure-isolation primitive the batch surface needs — it already exists, just never driven N-at-a-time from one submission. |

**Missing — this is the actual gap, not "no async plumbing":**

| Gap | Why it matters |
|---|---|
| No grouping concept | Nothing ties N job ids together as "one submission." Today there is one `toolId` + one `input` per job; a batch needs `{ toolId, items: [...] }` in and an ordered set of job ids out. |
| No aggregate status | A user with 50 items has no single number to look at; today they'd need 50 `GET /api/v1/jobs/:id` polls with no relationship between them. |
| No `partial` status | `JobStatus` is `queued \| running \| succeeded \| failed` — a batch where 49/50 succeeded and 1 failed has no honest status value to report. |
| No item metadata | `ForgeJob` has no `label` (original filename / first N chars of a pasted line) and no stable `index` — needed so a 50-row table doesn't reorder itself as items complete out of order. |
| No per-item retry | Re-running a 50-item batch to fix 1 failed item is exactly the waste a batch surface exists to avoid. |
| No result bundling | File-producing tools (image compress, md→pdf) need a zip; JSON-verdict tools (isbn, vin, secret-scan) do not. Nothing today distinguishes the two. |
| No size cap / abuse guard | `POST /api/v1/jobs` accepts one job; a naive `{ items: [...] }` wrapper with no cap is a queue-flooding vector. |
| No async axis on `sideEffect` | Gate 6 (§6.5) is `pure \| read \| write \| external`. A batch call returns 202 + a job id, not a value — that's an orthogonal axis (sync vs async), not a fifth side-effect class, and it doesn't exist yet. Flagged as an open question, not solved here — solving it touches `page-model.ts`, which is out of file-scope for this brief. |
| No UI component | Nothing in `tool-workspace.tsx` renders a queue. Flagged as wiring needed, not built here — that file is explicitly out of scope for this brief. |
| No MCP/OpenAPI operations | `forge.batch.*` doesn't exist. |

## 2. Competitor research (real products reached)

Captures: `docs/research/forge/processor/*.png` (gitignored local reference,
regenerable via `scripts/research-screenshot.mjs`).

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| TinyPNG | https://tinypng.com/ | Yes — WebFetch + screenshot | [tinypng.png](../../research/forge/processor/tinypng.png) |
| iLoveIMG Compress | https://www.iloveimg.com/compress-image | Yes — WebFetch + screenshot (entry state only, see limitation below) | [iloveimg-compress.png](../../research/forge/processor/iloveimg-compress.png) |
| Squoosh | https://squoosh.app/ | Yes — screenshot | [squoosh.png](../../research/forge/processor/squoosh.png) |
| CloudConvert | https://cloudconvert.com/ | Yes — screenshot | [cloudconvert.png](../../research/forge/processor/cloudconvert.png) |
| FreeISBN bulk validator | https://freeisbn.com (per `docs/plans/tools/isbn.md`, already researched and captured by that brief) | Cited from an existing, already-verified internal brief, not re-fetched here | see `docs/research/forge/isbn/` |
| EAN Check bulk lookup | per `docs/plans/tools/ean-upc-gtin.md` (already researched) | Cited from existing internal brief | see `docs/research/forge/ean-upc-gtin/` |

**Capture limitation, stated honestly:** `research-screenshot.mjs` and
`WebFetch` load a URL; they do not drive a real file picker or drag-and-drop
event. Every capture above except CloudConvert's format catalog is therefore
the **pre-upload entry state** of the tool, not the in-progress or completed
state. Any claim below about what a per-item row looks like *while running*
comes from text the product itself publishes (FAQ copy, UI microcopy visible
in the static DOM before upload, or the already-committed isbn.md /
ean-upc-gtin.md briefs, which did reach bulk-paste products where the
post-submit state renders as static server-side HTML rather than a JS file
picker). Where no such text exists, this brief says "not verified," not a
guess.

**What was actually reached, concretely:**

- **TinyPNG**: the drop-zone copy states the run limit outright — *"Up to 20
  images, max 5 MB each"* (WebFetch-confirmed exact text) — and separately
  gates the free tier to *"freely convert up to 3 images"* (compression itself
  is unlimited; the cap is on paid-tier conversions). This is a real, citable
  data point: **the cap is stated on the drop-zone itself, before upload**, not
  discovered by trial and error.
- **iLoveIMG Compress**: WebFetch of the live page surfaces `Uploading file 0
  of 0` and `Time left – seconds – Upload speed – MB/S` as DOM strings —
  i.e. the *client bundle ships an overall upload-progress counter format*
  (`file X of N`), confirmed present in markup even though the JS state
  driving it wasn't exercised. It does **not** reveal per-item processing
  status text this way — that part is not verified.
- **CloudConvert**: the "API & Integrations" panel on the marketing page shows
  a real, literal example of their job body:
  ```json
  { "tasks": {
      "import-1": { "operation": "import/url", "url": "..." },
      "convert-1": { "operation": "convert", "input": "import-1", "output_format": "docx" },
      "export-1": { "operation": "export/url", "input": "convert-1" }
  }}
  ```
  This is the single most useful thing reached in this research: a
  production batch/pipeline API models each unit of work as a **named node
  with an explicit dependency edge** (`input: "import-1"`), not a flat array.
  For Forge's much simpler case (N independent invocations of the *same*
  tool, no cross-item dependency) a flat array is still the right shape —
  but the node-per-unit-of-work-with-its-own-id principle is exactly what
  §3's item model below does with job ids.
- **Squoosh**: confirmed single-file only — no batch affordance anywhere on
  the entry page. Cited as a **negative data point**: even a best-in-class
  image tool does not always mean bulk; Squoosh's single-image, side-by-side
  compare-and-tune journey is a different archetype entirely (closer to
  Two-pane compare) and is out of scope for what this brief is designing.
- **isbn.md / ean-upc-gtin.md (internal, already verified)**: both briefs
  independently converged on the same finding without prompting from this
  brief — bulk results render as **a table with one column per verdict field
  and per-row status**, not a JSON blob and not a zip, because the payload
  per item is small (a validity verdict, not a file). isbn.md explicitly
  documents FreeISBN's *"Currently, our tool processes one ISBN at a time...
  for bulk validation requests, reach out to us"* — i.e. a real, ranking
  competitor explicitly refuses self-serve bulk and pushes it to a sales
  conversation. That is a gap this surface should close, not a pattern to
  copy.

## 3. The journey (what the research actually says, synthesized)

Two distinct product shapes showed up, and conflating them is the mistake to
avoid:

1. **File-in, file-out** (TinyPNG, iLoveIMG, CloudConvert) — the result *is*
   a file. Retrieval wants per-file download AND a zip. Upload progress and
   processing progress are two different numbers (iLoveIMG's DOM strings hint
   at this even though the split wasn't confirmed working); an honest UI keeps
   them visibly separate.
2. **Data-in, verdict-out** (FreeISBN, EAN Check, and six of our seven
   deferring tools) — the result *is* a table row, typically sub-second per
   item. There is no meaningful "download" until the user wants the whole
   table as CSV; a zip is never the right answer here.

Forge's Processor root serves **both**, because both are already promised:
image-compress/md-to-pdf-style tools are shape (1), file-type-detect /
line-ending-detect / secret-scan / language-detect / vin / ean-upc-gtin /
isbn are shape (2). One archetype, one component contract, two output modes
selected by a per-tool flag — not two archetypes.

## 4. The archetype: **Batch queue**, made concrete

Per §6.7.10's table, Batch queue = "many inputs, visible progress,
download-all." Here is the concrete version Forge ships.

### 4.1 Data model (extends, never replaces, `jobs.ts`)

A batch is a **manifest** (one record) pointing at N **items**, and each item
*is* a `ForgeJob` in the existing store — not a new engine, one new record
type plus two new fields on the job shape:

```ts
// New, alongside ForgeJob — same file family as jobs.ts
interface ForgeBatchManifest {
  readonly id: string;              // batchId
  readonly toolId: string;
  readonly resultKind: "file" | "json"; // drives zip-vs-table retrieval
  readonly itemIds: readonly string[];  // ordered — index = display order
  readonly createdAt: string;
}

// Additive fields on ForgeJob (backward compatible — optional, existing
// single-job callers are unaffected)
interface ForgeJob {
  // ...existing fields unchanged...
  readonly batchId?: string;
  readonly label?: string;   // filename, or first ~40 chars of a pasted line
}
```

`JobStatus` gains **one** value: `"skipped"` — for an item that fails
*input validation* before it is ever queued (e.g. an empty line in a bulk
paste), so it doesn't consume a job-store write for something that was never
going to run. `queued | running | succeeded | failed | skipped`.

Batch-level status is **derived, never stored**, from the item statuses —
avoids a second source of truth to keep in sync:

```
all skipped                          → failed   (nothing valid was submitted)
any queued or running                → running
all terminal, at least one succeeded
  and at least one failed/skipped    → partial
all terminal, all succeeded          → succeeded
all terminal, all failed/skipped     → failed
```

### 4.2 API surface (design only — reports what wiring is needed, does not
touch `apps/forge/src/app/api/v1/jobs/**`, which is out of file-scope here)

| Endpoint | Behavior |
|---|---|
| `POST /api/v1/batches` | Body `{ toolId, items: Array<{ label?: string, input: unknown }> }`. Validates `1 ≤ items.length ≤ FORGE_BATCH_MAX_ITEMS` (env-configurable cap; without one this is the exact queue-flooding vector flagged in §1). For each item: `store.create(toolId)` → stamp `batchId` + `label` + `index` → `markRunning` → `dispatchJob(...)`, reusing `job-dispatch.ts` unchanged. Writes one `ForgeBatchManifest`. Returns `202 { batchId, itemIds, resultKind }` immediately — does not block on any item. |
| `GET /api/v1/batches/:batchId` | Reads the manifest, then reads each item job (bounded by the cap, so this is never an unbounded fan-out) and returns the aggregate: `{ id, toolId, status, resultKind, counts: { total, queued, running, succeeded, failed, skipped }, items: [{ id, index, label, status, error? }] }`. **Item `result` payloads are never inlined here** — keeps the aggregate response small and O(1)-ish regardless of how large any one item's output is. |
| `GET /api/v1/jobs/:jobId` | **Unchanged, reused as-is** for per-item result fetch — a batch item's id is a job id, so the existing single-job endpoint already serves it. No new per-item read endpoint needed. |
| `POST /api/v1/batches/:batchId/items/:itemId/retry` | Re-creates *only* that one item's job (new job id, same `batchId`+`index`+`label`, old job id replaced in the manifest's `itemIds` at that index) and re-dispatches it. The other N-1 items are untouched — this is the direct fix for the "re-running 50 items to fix 1" waste identified in §1. |
| `GET /api/v1/batches/:batchId/download` | **Only when `resultKind === "file"`.** Bundles all `succeeded` items' results into one zip, streamed. For `resultKind === "json"` this endpoint doesn't exist for that batch (or returns `409 not_applicable`) — the aggregate GET response is already the full result set for a table. |

### 4.3 Failure isolation (already true by construction, made explicit)

The existing `jobs/worker/route.ts` wraps one `invokeTool` call per job in one
`try/catch` with no shared promise across jobs — that isolation is not new
work, it already exists because every job is independent today. The batch
layer's only obligation is to **not undo it**: item dispatch must be N
independent `dispatchJob` calls (whatever loop construct issues them, never a
`Promise.all` that would let one rejection interrupt sibling awaits before
they're issued — issuing is fire-and-forget per item already, per
`jobs/route.ts`'s inline-mode pattern). Item 7 of 50 failing changes exactly
one row's status to `failed` and the batch's derived status to `partial`;
items 8–50 are unaffected because there is no code path that connects them.

### 4.4 Progress semantics

- **Two counters, not one**, because iLoveIMG's own markup conflates them and
  that's a real, avoidable UX weakness: *uploaded X/N* (client-side, only
  meaningful for file-in tools) is tracked separately from *processed X/N*
  (server-side, from the aggregate GET's `counts`). A paste-based tool
  (vin, isbn, ean-upc-gtin, secret-scan, language-detect) has no upload
  phase at all — only the processed counter applies.
- **No per-item progress bar.** Every deferring tool's per-item unit of work
  is sub-second-to-low-seconds and `pure`/`read` (per §6.7.8's 99.3% pure
  share) — a spinner-then-check/✕ icon per row is honest; a fake progress bar
  on a sub-second operation is not. This is a deliberate difference from
  file-tier tools that might genuinely take longer per item (image compress
  at scale) — those may show an indeterminate spinner per row too, since even
  they are typically sub-5s per image; no tool currently on this surface
  needs a determinate per-item percentage.
- **Client polls `GET /api/v1/batches/:batchId`**, not each item — one
  request regardless of N. Recommended cadence ~1s while status is
  `queued`/`running`, stopped once status is terminal (`succeeded` /
  `partial` / `failed`). A bounded max-wait (e.g. 2 minutes of polling) after
  which the UI says the batch is still running in the background and the
  page can be safely left — because retrieval (§4.5) does not depend on the
  tab staying open.

### 4.5 Retrieval

- **`resultKind: "json"` tools** (all seven deferring tools): the aggregate
  `GET` response's `items[]` array (with per-item `status`/`error`, plus a
  client-side fetch of each `succeeded` item's own `result` via the existing
  `GET /api/v1/jobs/:jobId`) is rendered as a table — matches what isbn.md
  and ean-upc-gtin.md already independently concluded competitors do right.
  A "copy all as CSV" client-side action covers export; no server zip needed.
- **`resultKind: "file"` tools**: per-row download link (fetches that item's
  own job result) **and** a "Download all (.zip)" action once the batch is
  terminal — the dual retrieval both TinyPNG-family tools converge on.
- **Closable and resumable.** The batch id lives in the page URL
  (`?batch=<id>`). A refresh or a return visit re-hydrates purely by polling
  `GET /api/v1/batches/:batchId` again — no client-side state is load-bearing.
  Expiry reuses the existing `JOB_TTL_SECONDS` (24h) already defined in
  `jobs.ts` for the Upstash path; the manifest key should carry the same TTL
  so a batch and its items expire together, never a dangling manifest
  pointing at expired items.

### 4.6 Component contract (for whoever wires `tool-workspace.tsx` — not
built here, that file is out of scope for this brief)

A `<BatchQueue>` component that all seven tools (and future ones) adopt
identically, configured per tool rather than reimplemented per tool:

```ts
interface BatchQueueProps {
  toolId: string;
  accept: "files" | "lines";       // drag-drop multi-file, or paste-many-lines
  resultKind: "file" | "json";
  maxItems: number;                 // from tool descriptor or a global default
  buildItemInput: (raw: File | string) => unknown; // per-tool adapter into
                                                     // that tool's own Zod input
  renderRow: (item: BatchItemView) => ReactNode;    // per-tool result rendering
}

interface BatchItemView {
  id: string; index: number; label: string;
  status: "queued" | "running" | "succeeded" | "failed" | "skipped";
  error?: string;
}
```

Note this only fires when a Core tool's own synchronous bulk-paste ceiling is
exceeded — isbn.md and ean-upc-gtin.md's Core tools already do fast,
synchronous bulk-paste up to their own stated caps (no artificial cap for
isbn; unspecified-but-present for ean-upc-gtin) entirely client-side, with no
job created at all. The Processor/J surface is specifically for the case
that ceiling doesn't cover: many files (not pastable text) or paste volume
large enough that synchronous processing would block the request. This
brief does not change any Core tool's already-decided bulk-paste behavior —
it is the layer *above* it, reached only when a real file-upload or
above-ceiling batch is the ask.

### 4.7 Agent-facing (J) contract

- Two new MCP/OpenAPI operations: `forge.batch.create` → `POST
  /api/v1/batches`, `forge.batch.get` → `GET /api/v1/batches/:batchId`. Per
  §6.7.5's derivation rule, the per-item `input` schema is **not**
  hand-authored again — it's the same Zod `inputSchema` each wrapped tool
  already derives its OpenAPI/MCP schema from, array-wrapped generically once
  at the batch layer (`items: array<{ label?: string, input: <tool's own
  schema> }>`). No second schema to drift.
- **Open question, not solved here:** gate 6 (§6.5) — `pure | read | write |
  external` — has no axis for synchronous-vs-async return. A batch call
  (and, pre-existing, any Job-tier tool like md-to-pdf) returns `202 +
  jobId`, not a value. This is a real gap in the ship-gate vocabulary, not
  something this brief can fix — fixing it touches `page-model.ts`, which is
  explicitly out of this brief's file scope. Flagged for whoever owns that
  file.
- **Agents should be told, in each wrapped tool's SKILL.md** (not yet
  written for any tool, W4 per §6.7.6): poll `forge.batch.get` with backoff,
  a stated max wait, and that per-item results are retrievable before the
  whole batch reaches a terminal state (`GET /api/v1/jobs/:jobId` on any
  `succeeded` item id works immediately, independent of sibling items) — an
  agent that only needs the first 3 of 50 results should not be told to
  block on all 50.
- **Error contract**: item-level errors reuse the existing stable
  `${code}: ${message}` shape already produced by `invokeTool` failures in
  `jobs/worker/route.ts` — nothing new to design there. Two new
  batch-level codes: `batch_not_found`, `batch_too_large` (returned by
  `POST /api/v1/batches` when `items.length` exceeds the cap, *before* any
  item is created — an all-or-nothing rejection at submission time, distinct
  from partial in-flight failure).

## 5. What each of the seven tools gets, concretely

None of the seven need bespoke batch UI. Each supplies exactly:
`toolId`, `accept` (all seven are `"lines"` except file-type-detect and
line-ending-detect, which are `"files"` per their own briefs' file-upload
paths), `resultKind: "json"` (all seven — none produce a file), and
`buildItemInput` (a one-line adapter into the tool's existing Zod schema).
`renderRow` is the only real per-tool work, and it is presentational, not a
new journey.

## 6. Non-goals

- A generic "processor" landing page or `/r/processor` SEO hub. §6.7.9 is
  explicit: "chasing 'processor' as an SEO root would produce junk pages."
  This surface has no keyword page; traffic stays on the tool pages that
  already rank, which route to this surface only once their own ceiling is
  exceeded.
- Cross-item dependency graphs (CloudConvert's `import → convert → export`
  chaining). Forge's batch case is N independent invocations of the *same*
  tool — a flat array, not a DAG. If Forge ever needs true pipeline chaining
  (§6.7.10's "tools compose" claim), that is a different, larger design and
  explicitly out of scope here.
- Solving the sync/async axis gap in the ship-gate's `sideEffect` enum.
  Flagged, not fixed (§4.7).
- Building the `<BatchQueue>` component, the new API routes, or the MCP/
  OpenAPI operations. This brief is the design; implementation lands in the
  files this brief is deliberately not allowed to touch.

## 7. Ship-gate checklist status (for tracking, not yet built)

Per §6.5: this brief satisfies gate 11 (competitor teardown, §2) and gate 12
(archetype chosen deliberately — Batch queue, §3–4, with the two-shape split
stated explicitly rather than papered over). Gates 1–10 are implementation
work: new API routes, `<BatchQueue>` component, MCP/OpenAPI operations,
meter id for batch submission, SKILL.md text for each of the seven tools —
all out of scope for this research-and-design brief, and none of it should
start until whoever owns `jobs.ts`/`job-dispatch.ts`/the jobs API routes and
`tool-workspace.tsx` has reviewed §4's proposed additive schema.

## Screenshots

- [docs/research/forge/processor/tinypng.png](../../research/forge/processor/tinypng.png)
- [docs/research/forge/processor/iloveimg-compress.png](../../research/forge/processor/iloveimg-compress.png)
- [docs/research/forge/processor/squoosh.png](../../research/forge/processor/squoosh.png)
- [docs/research/forge/processor/cloudconvert.png](../../research/forge/processor/cloudconvert.png)

## Gaps / open questions

- [ ] The post-upload / in-progress state of TinyPNG, iLoveIMG and CloudConvert
      was not reachable by static capture (SPA state after a real file
      picker/drag-drop event). Everything claimed about their per-item running
      state comes from DOM strings visible before upload (iLoveIMG's `file 0
      of 0` counter format) or from FAQ/marketing copy (TinyPNG's stated cap,
      CloudConvert's published API example) — never from an actually-observed
      in-progress screen. Re-verify with a real interactive browser session
      before treating the two-counter (upload vs process) proposal in §4.4 as
      more than a reasonable inference.
- [ ] `resultKind` needs to live somewhere on the tool descriptor for the
      seven wrapped tools to declare it — no such field exists on the
      registry today (`tools/index.ts` is out of file-scope for this brief).
- [ ] `FORGE_BATCH_MAX_ITEMS` default value is not chosen here — needs an
      owner decision informed by real per-tool cost (a `pure` isbn check and
      a `md-to-pdf` render have very different per-item cost, so one global
      cap may be wrong; a per-tool override may be needed).
- [ ] The sync/async axis on `sideEffect` (§4.7) needs an owner — this brief
      surfaces it, does not resolve it.
