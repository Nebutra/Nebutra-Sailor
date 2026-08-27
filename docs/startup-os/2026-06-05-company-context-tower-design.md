# Company Context Tower — Design Spec

**Date:** 2026-06-05
**Status:** Agreed design, pre-implementation
**Affects:** `apps/web/src/lib/startup-os/` — new module; `compiler.ts` rewrite deferred to a later workflow.
**Blast radius reference:** `docs/startup-os/company-context-blast-radius.md`

---

## Goal

Replace the flat `CompanyContext` interface and its hardcoded regex heuristics (`detectMarket`, `titleFromThesis`, `normalizePromise`) in `apps/web/src/lib/startup-os/compiler.ts` with a structured, AI-native, nine-layer "tower" that is the single source of truth for a Startup OS project's company identity.

The tower gives every value a provenance, a confidence score, and a status lifecycle. It exposes a minimal tool surface that agents use without reading the entire context. It is keyless-testable from day one.

---

## Non-Goals

- This workflow does not touch `compiler.ts`. The flat `CompanyContext` continues to exist until a dedicated rewrite workflow replaces it. No projection shim or adapter layer is built to bridge the two; the eventual replacement is a direct rewrite.
- Prisma persistence, RLS, or any database migration. Storage in this workflow is an in-memory repository only.
- MCP server wiring. The tool surface is designed to be MCP-ready, but MCP registration happens in a later workflow.
- UI implementation. Floor cards and the tower visual are specified here for orientation but built separately.
- The nine canonical layers are fixed. This spec does not deliberate on adding or removing layers.

---

## Architecture

### The Tower as Source of Truth

A project's company identity is modelled as a vertical stack of nine layers — a 九层塔 (nine-layer tower). The metaphor is intentional: the structure is bottom-heavy in stability (L1 essence is "century-stable"), top-heavy in operational frequency (L9 execution changes weekly). Visually and conceptually, the crown (L9) is the live control deck; the foundation (L1) is the engraved one-liner that rarely if ever changes.

Each layer owns a fixed set of seed fields, but fields are extensible: agents and users may add or delete fields within any layer at runtime. What is never extensible is the layer registry itself — nine layers, fixed order, fixed identifiers L1 through L9.

Every stored value is wrapped in a `FieldValue` envelope that records who or what produced the value (provenance), how confident the system is in it, and whether a human has approved and locked it. This is the AI-native core: the tower is not just a bag of strings but a structured audit trail of how each piece of company knowledge was derived.

### Tool Seam

All reads and writes go through an explicit tool surface that sits over a repository interface. Nothing in the system reads the tower directly from a storage object; everything goes through one of the named tool functions. This keeps the storage swappable (in-memory today, Prisma JSON document tomorrow) and makes every access point observable and auditable.

The tool surface is designed to be called in-process by AI SDK tool invocations, and later exposed as MCP tools without API changes.

---

## Data Model

### Layer Registry

The nine layers are a fixed, ordered registry. Each layer entry carries:

- **id** — canonical identifier, one of `L1` through `L9`.
- **zh** — Chinese name (used in UI and agent prompts).
- **en** — English name.
- **stability** — a categorical string describing how often the layer is expected to change. Values: `"century"`, `"decades"`, `"years"`, `"years_1_3"`, `"quarter"`, `"half_year"`, `"years_1_2"`, `"years_5_plus"`, `"weekly"`.
- **question** — the orienting question the layer answers (为何存在 / 去哪里 / etc.), displayed to users and injected into agent prompts.
- **seedFields** — the initial field definitions shipped with the registry. These are the baseline; they may be extended or pruned per project.

The nine layers in order:

| id | en | zh | stability | question |
|----|----|----|-----------|----------|
| L1 | essence | 本质 | century | 为何存在 |
| L2 | future | 未来 | decades | 去哪里 |
| L3 | principles | 原则 | years | 怎么做事 |
| L4 | strategy | 战略 | years_1_3 | 怎么赢 |
| L5 | product | 产品 | quarter | 造什么 |
| L6 | users | 用户 | half_year | 服务谁 |
| L7 | narrative | 表达 | years_1_2 | 怎么讲 |
| L8 | identity | 身份 | years_5_plus | 是谁的化身 |
| L9 | execution | 执行 | weekly | 接下来干什么 |

L8 is the brand-kit floor: it holds logo, colors, fonts, image assets, design guide, brand guide, archetype, and tone. L9 is the live control deck wired to the existing `StartupOperatingRun` ledger; its `live_runs` field stores run IDs as links, not copied run data.

### Field Definitions

Each field in a layer is described by a `FieldDef`:

- **key** — unique within the layer, snake_case string.
- **label** — human-readable display name.
- **kind** — one of `"line"` (short single-line text), `"text"` (multi-line prose), `"list"` (array of strings), `"structured"` (a JSON object with its own schema), `"asset"` (a file reference or URL), `"link"` (a reference to another entity by ID — used by `live_runs` to reference `StartupOperatingRun` IDs).
- **required** — boolean; required fields drive the completeness calculation.

Seed fields per layer:

**L1 essence:** `mission` (line, required), `why` (text), `technical_belief` (text).
**L2 future:** `vision` (line), `bhag` (structured), `vivid_description` (text).
**L3 principles:** `values` (list), `operating_principles` (list), `safety_tenets` (list).
**L4 strategy:** `positioning` (structured, required), `category` (line), `wedge` (line), `moat` (text), `pov` (text).
**L5 product:** `jtbd` (structured, required), `value_proposition` (text), `pr_faq` (text).
**L6 users:** `icp` (structured, required), `personas` (list), `trigger_event` (line).
**L7 narrative:** `narrative` (text), `manifesto` (text), `tagline` (line), `messaging` (list).
**L8 identity:** `logo` (asset), `colors` (asset), `fonts` (asset), `images` (asset), `design_guide` (text), `brand_guide` (text), `archetype` (structured), `tone` (list).
**L9 execution:** `okrs` (structured), `roadmap` (structured), `nsm` (line), `bets` (list), `live_runs` (link).

Fields are extensible at runtime via the `addField` and `deleteField` tools. The seed list is a starting point, not a ceiling.

### FieldValue and Provenance

Every stored field value is wrapped in a `FieldValue` envelope validated by a Zod schema. The fields are:

- **layerId** — enum of `L1` through `L9`.
- **fieldKey** — string, the field's key within its layer.
- **kind** — the `FieldKind` of the field at the time of write.
- **value** — the actual content; type is `unknown` at the envelope level, validated per-field by kind-specific Zod refinements.
- **status** — enum: `"empty"` (no value yet), `"draft"` (AI-produced or in-progress, not reviewed), `"ready"` (all required fields filled, or human-reviewed but not locked), `"locked"` (human-approved, protected from casual overwrite). Default is `"empty"`.
- **provenance** — enum: `"user"` (typed directly), `"ai"` (generated by a language model invocation), `"document"` (extracted from an uploaded document), `"agent"` (written by an autonomous agent run). This field is required on every upsert — no value may be stored without a declared provenance.
- **confidence** — optional number from 0 to 1, populated when provenance is `"ai"` or `"agent"`.
- **updatedBy** — optional string identifying the user or agent that last wrote the value.
- **updatedAt** — ISO 8601 timestamp string.
- **runId** — optional string; when provenance is `"ai"` or `"agent"`, this references the `StartupOperatingRun` that produced the value.

The `"locked"` status is the human approval gate. An `upsertField` call targeting a locked field throws unless the caller passes an explicit `force: true` flag. This prevents agents from silently overwriting values a founder has approved.

### Completeness and Stability

**Completeness** for a layer is computed as the ratio of filled required fields to total required fields. A field is considered filled when its status is not `"empty"`. This is a number from 0 to 1.

**Layer status** derived from completeness:
- `"empty"` — no required fields are filled (completeness = 0).
- `"partial"` — some but not all required fields are filled (0 < completeness < 1).
- `"ready"` — all required fields are filled (completeness = 1).

Stability is a descriptor on the layer definition, not on individual values. It communicates to agents and users how frequently a layer is expected to change. Agents that update high-stability layers (L1, L2, L8) should treat any existing `"ready"` or `"locked"` values with greater caution than they would an L9 bet.

### Stage and Progressive Disclosure

**Stage** encodes the company's current funding/maturity stage: `"pre_seed"`, `"seed"`, `"series_a"`, `"post_a"`. Stage governs which layers are prioritized — it does not restrict access to any layer.

The `pendingForStage` flag on each layer in the manifest marks which layers the current stage should focus on filling first. This is a non-blocking hint for agents and UI:

- **pre_seed** — L1 (essence), L5 (product), L6 (users), L9 (execution).
- **seed** — adds L2 (future), L4 (strategy), L7 (narrative).
- **series_a** — adds L3 (principles) plus full L4 and L7.
- **post_a** — adds L8 (identity) plus weekly-cadence L9.

### Context Manifest

The `ContextManifest` is the cheap, value-free summary of the tower. It is what agents receive by default. It contains:

- **projectId** — the project identifier.
- **stage** — the current company stage.
- **layers** — an array of layer summaries, each containing: `id`, `zh` (Chinese name), `stability`, `completeness` (0..1), `status` (`"empty"` | `"partial"` | `"ready"`), `fieldKeys` (an array of key strings — keys only, never values), and `pendingForStage` (boolean).

The manifest is deliberately value-free. An agent that calls `describe(projectId)` learns the shape and health of the tower without loading any actual company content. It then calls `getLayer` or `getField` only for the slices it needs. This is the progressive disclosure principle applied to agent context management.

---

## Tool Surface

All tools operate over the repository interface. Provenance is required on every write. Tools are defined in-process for AI SDK use and are designed to be wrapped as MCP tools later without signature changes.

### Read Tools

**`describe(projectId)`** — returns a `ContextManifest`. This is the entry point for any agent beginning to reason about company context. It is cheap: no field values are loaded.

**`getLayer(projectId, layerId)`** — returns all field definitions and their current `FieldValue` envelopes for a single layer. Use when the agent needs the full content of one floor.

**`getField(projectId, layerId, fieldKey)`** — returns the `FieldValue` for a single field. Use when the agent has a specific question to answer about one data point.

**`search(projectId, query)`** — returns a list of `{ layerId, fieldKey, snippet }` objects where the stored value contains a match for the query. Allows agents to find relevant fields without reading the whole tower. Snippet is a short excerpt of the matching value.

### Write Tools

**`upsertField(projectId, layerId, fieldKey, value, { provenance, confidence?, runId?, force? })`** — writes a value to a field. Provenance is required. If the field's current status is `"locked"` and `force` is not `true`, the call throws. On a successful write, the field status transitions from `"empty"` to `"draft"` if provenance is `"ai"` or `"agent"`, or to `"ready"` if provenance is `"user"` or `"document"`. The layer's completeness is recomputed after the write.

**`addField(projectId, layerId, { key, label, kind, required? })`** — adds a new field definition to a layer. Does not create a value; the field starts with status `"empty"`. Fails if a field with the same key already exists on the layer.

**`deleteField(projectId, layerId, fieldKey)`** — removes a field definition and its stored value from a layer. Fails if the field is `"locked"`.

**`lockField(projectId, layerId, fieldKey)`** — sets the field's status to `"locked"`. Intended as the human approval action. The field value is not changed.

**`unlockField(projectId, layerId, fieldKey)`** — removes the lock, reverting status to `"ready"`. Requires explicit human intent.

### Compound Tools

**`compileFromThesis(projectId, thesis, { stage?, invokeModel? })`** — seeds the entire tower from a one-sentence founding thesis. When `invokeModel` is provided, the function uses it to generate candidate values for each layer's required fields, storing each with provenance `"ai"`. When `invokeModel` is absent (or `undefined`), the function produces a deterministic, minimal result — it fills each required field with a structured placeholder derived from the thesis string, with no network call. This is the keyless-testable path. Returns the updated `ContextManifest`.

**`fillFromDocument(projectId, text, { invokeModel? })`** — extracts structured data from a block of text (e.g., a pitch deck transcript, a strategy document) and bulk-upserts the extracted values with provenance `"document"`. With `invokeModel`, uses the model to perform the extraction. Without it, performs a deterministic best-effort extraction using keyword matching. Returns a list of the fields that were updated.

---

## Storage

### In-Memory Repository (This Workflow)

The repository is defined as a TypeScript interface with the following operations: read the manifest, read a layer, read a field, upsert a field value, add a field definition, delete a field definition, and list all fields for a layer. The in-memory implementation holds data in a plain `Map` keyed by `projectId`. It has no external dependencies and no async I/O beyond the function signatures (which are async for interface compatibility).

Because the interface is injected, tests instantiate the in-memory implementation directly. No mocking or environment variables are needed.

### Prisma JSON Document Store (Later Workflow)

A future workflow will add a `CompanyContextDocument` model to the Prisma schema. The model will store the full tower as a JSONB column on a table that belongs to the `Tenant` supertype (following the tenancy model established in the project). RLS will enforce tenant isolation using the `app.current_tenant_id` GUC convention. The repository interface will gain a `PrismaCompanyContextRepository` implementation. No changes to the tool surface or the in-memory implementation are required when this swap happens.

---

## Rewrite Plan and Blast Radius

The full blast radius is tracked in `docs/startup-os/company-context-blast-radius.md`. This section summarizes the rewrite sequence.

**Phase 1 (this workflow):** Build the new module in `apps/web/src/lib/startup-os/company-context/`. Deliver the layer registry, field definitions, Zod schemas for `FieldValue`, the in-memory repository, and the full tool surface. All unit tests pass keylessly.

**Phase 2 (later workflow — compiler rewrite):** Remove the flat `CompanyContext` interface, the `detectMarket`, `titleFromThesis`, and `normalizePromise` regex heuristics from `compiler.ts`. Replace every reference to the old interface with calls through the tool surface. This is a direct rewrite, not a shim. The compiler becomes a thin adapter that calls `compileFromThesis` and then reads specific fields via `getField` to produce its output artifacts. After Phase 2, no code in the codebase should import or reference the old flat interface.

**Phase 3 (later workflow — Prisma persistence):** Add the Prisma model, implement `PrismaCompanyContextRepository`, wire RLS, update dependency injection in the gateway and web app.

**Phase 4 (later workflow — MCP exposure):** Register the tool surface as MCP tools so external agents can interact with the tower over the MCP protocol.

The blast radius for Phase 2 is bounded to `apps/web/src/lib/startup-os/compiler.ts` and any callers that destructure `CompanyContext` fields directly. Those callers must be migrated to use `getField` or `getLayer` through the repository. The layer registry guarantees that every field in the old flat interface maps cleanly to a field in L1, L4, L5, L6, or L7 — no information is lost.

---

## UI (Tower and Floor Cards — Later)

The UI specification is deferred but the agreed visual language is recorded here to guide later implementation.

The tower renders as a vertical stack of nine floors in a single scrollable column. The visual metaphor is 上重下轻: the crown (L9) appears at the top of the viewport and carries the most motion and interactivity (live OKR indicators, agent run links); the foundation (L1) appears at the bottom and is the most static, rendered as a single engraved one-liner with minimal chrome.

Each floor is a collapsible card. Collapsed state shows: layer name (zh + en), stability badge, completeness ring (0..1 as a circular progress indicator), and a status chip. Expanded state shows all the layer's fields as AI-native fill cards — each card displays the field label, kind badge, current value (or an empty-state prompt), provenance tag, confidence score (when available), and a lock/unlock affordance.

L8 (identity) renders as the full brand-kit floor: logo preview, color swatches, font specimens, image gallery, and links to design/brand guides. L9 (execution) renders as the live control deck: OKR progress bars, roadmap milestones, the north-star metric, active bets, and a list of linked `StartupOperatingRun` entries pulled by ID.

Progressive disclosure applies to the UI just as it does to agents: floors load their field values lazily on expand, not on page load. The manifest is fetched on mount; individual layers are fetched on user interaction.

---

## Testing

All unit tests are keyless. No test may require an API key, a database connection, or a network call.

### Test Strategy

**Layer registry** — static assertions that the registry contains exactly nine entries in L1..L9 order, that each entry has the required metadata fields, and that the seed field lists match the spec.

**FieldValue schema** — Zod parse tests covering valid cases for each provenance type and kind, and rejection tests for missing provenance, out-of-range confidence, and invalid status transitions.

**In-memory repository** — CRUD tests: upsert a field, read it back, verify provenance is stored; attempt to overwrite a locked field without `force`, expect a throw; add a custom field, verify it appears in `getLayer`; delete a field, verify it is gone.

**Completeness** — unit tests that verify the ratio calculation: a layer with two required fields and one filled yields 0.5; all filled yields 1.0; none filled yields 0.

**Manifest** — tests that `describe` returns a manifest with no field values, that `fieldKeys` is an array of strings, and that `pendingForStage` is set correctly for each stage.

**`compileFromThesis` (keyless path)** — given a thesis string and no `invokeModel`, verify that each required field across all nine layers has a non-empty value with provenance `"ai"` and status `"draft"` (or that the function at minimum produces a deterministic placeholder without error). Verify that the returned manifest shows non-zero completeness.

**`fillFromDocument` (keyless path)** — given a short document string and no `invokeModel`, verify the function returns without error and that any extracted fields have provenance `"document"`.

**`compileFromThesis` (injected model path)** — pass a mock `invokeModel` that returns a fixed JSON response; verify that the tower is populated with the mock values, that provenance is `"ai"`, and that `runId` is threaded through when provided.

The `invokeModel` injection pattern mirrors the existing `executeStartupRun` convention in `apps/web/src/lib/startup-os/execution.ts`. Any future LLM integration can be swapped in or out at the call site without changing the engine.

---

## Open Questions

1. **`compileFromThesis` output format contract.** When `invokeModel` is provided, what JSON schema does the prompt ask the model to return? The engine needs a stable extraction schema to parse the response. Should this be a flat `{ layerId, fieldKey, value }[]` array, or a nested `{ L1: { mission: "..." }, ... }` object? A flat array is more resilient to partial responses and easier to validate with Zod.

2. **`search` implementation.** The spec calls for substring or semantic matching over stored values. For the in-memory store, substring matching is sufficient. When Prisma + JSONB lands, should `search` delegate to `@nebutra/search` (Meilisearch/Typesense/Algolia) or use Postgres full-text search on the JSONB column? The answer affects whether the repository interface needs to expose a `search` method or whether the tool wraps the search package directly.

3. **Confidence decay.** Should confidence scores decay over time as the layer's stability implies the value is aging? For example, an L9 field with confidence 0.9 that has not been updated in 30 days might decay toward 0.5. This would require a time-aware read path and has implications for what agents see in `getField`. Defer to Phase 3 or later.

4. **`live_runs` link kind.** The `link` kind on `live_runs` stores `StartupOperatingRun` IDs. Should the `getField` response for a `link` field return just the IDs, or should it inline a minimal summary of each referenced run (status, stage, timestamps)? Inlining improves agent ergonomics but couples the tower read path to the execution ledger.

5. **Per-field history.** The current spec stores only the latest `FieldValue` per field. Should the repository retain a history of past values (for audit and rollback)? This is straightforward to add to the interface (`getFieldHistory(projectId, layerId, fieldKey) -> FieldValue[]`) but adds storage cost. Relevant for locked fields where a human may want to see what the AI wrote before they approved.

6. **`addField` key collision across layers.** Keys are unique within a layer. Should the system also warn or prevent duplicate keys across layers for fields that are semantically equivalent? This is a UX question, not a data integrity one; the data model allows the same key in different layers.

7. **Blast radius doc.** `docs/startup-os/company-context-blast-radius.md` is referenced here but does not yet exist. It should be created as part of Phase 2 planning, enumerating every file that imports or references the old flat `CompanyContext` interface.
