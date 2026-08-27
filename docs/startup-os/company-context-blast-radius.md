# CompanyContext Blast Radius — Nine-Layer Tower Migration

**Date:** 2026-06-05
**Scope:** Every file that reads a flat `CompanyContext` field (`name`, `category`, `market`,
`coreBet`, `promise`, `moat`, `operatingModel`) or the type itself (`CompanyContext` /
`project.companyContext`).

This document feeds the NEXT workflow that replaces the flat interface with the nine-layer tower.
It is exhaustive: every read site, every test fixture, every audit log reference.

---

## 1. Definition site

### `apps/web/src/lib/startup-os/compiler.ts`

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `CompanyContext` (interface) | Declares all 7 fields | **Replace** with nine-layer tower type |
| `buildCompanyContext()` | Writes `name`, `category`, `market`, `coreBet`, `promise`, `moat`, `operatingModel` | Rewrite to populate the nine-layer structure |
| `normalizeStartupProjectCopy()` | Reads `project.companyContext.promise` (LEGACY_PROMISE_MARKER guard), then spreads `project.companyContext` | Change `.promise` access to the layer that holds the promise field in the tower |
| `buildArtifacts()` | Reads `context.name`, `context.category`, `context.market`, `context.coreBet`, `context.name` (brand), `context.name` (film), `context.name` (landing) | Map each to the correct tower layer |
| `buildSignals()` | Reads `context.promise.length` (Thesis clarity score) | Map to the tower field that holds the promise text |
| `compileStartupProject()` | Calls `buildCompanyContext()`, assigns result to `context`, passes to `buildArtifacts()`, `buildSignals()`, `companyContext: context` | Automatically fixed by rewriting `buildCompanyContext()` |
| `StartupOSProject.companyContext` (field) | Typed as `CompanyContext` | Re-type to `CompanyContext` (tower shape) |

---

## 2. Store (`apps/web/src/lib/startup-os/store.ts`)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `isStartupOSProject()` | `isRecord(value.companyContext)` — structural check only | No field changes; still passes as long as `companyContext` is an object |
| `saveStartupProjectRecord()` | `project.companyContext.name` — used as `atelierCanvas.name` (canvas row display name) | Access `name` from whichever tower layer it moves to (e.g. `project.companyContext.identity.name`) |

---

## 3. Conversation engine (`apps/web/src/lib/startup-os/conversation.ts`)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `buildStartupConversationPrompt()` | `project.companyContext` — serialised wholesale via `JSON.stringify` into the LLM prompt | The tower object will be serialised instead; no field-by-field access but **the prompt schema the model sees changes** — update the system-prompt doc comment |

---

## 4. Execution engine (`apps/web/src/lib/startup-os/execution.ts`)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `buildStartupRunPrompt()` | `project.companyContext` — serialised wholesale via `JSON.stringify` into the LLM prompt | Same as conversation: the full tower is serialised; update the system-prompt doc comment |

---

## 5. Files generator (`apps/web/src/lib/startup-os/files.ts`)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `packageJsonContent()` | `project.companyContext.name` — used as npm package name (slugified) | Access `name` from tower identity layer |
| `rootRouteContent()` | `project.companyContext.name` — used as `<title>` in `__root.tsx` | Access `name` from tower identity layer |
| `indexRouteContent()` | Indirect — emits `companyContext.name` and `companyContext.promise` as JS expressions in the generated source file (`{companyContext.name}`, `{companyContext.promise}`) | Generated code references the **runtime JS shape** the tower module exports, so `src/lib/company-context.ts` must export the tower's `name` and `promise` at the path the generated JSX uses |
| `companyContextTs()` | `project.companyContext` — serialised via `JSON.stringify` into the generated `src/lib/company-context.ts` file | The full tower will be serialised; downstream generated code that reads `.name` / `.promise` must reach into the tower layers |
| `readme()` | `project.companyContext.name`, `project.companyContext.promise` | Access from tower identity / positioning layers |
| `buildStartupPreviewHtml()` | Reads `name` and `promise` from `src/lib/company-context.ts` file content via regex (`readCompanyContextField`) | The regex parses the **generated file's JSON literal** — still works as long as `name` and `promise` appear as top-level JSON fields in the emitted file; if the tower nests them, the regex path must be updated |

---

## 6. UI component (`apps/web/src/components/startup-os/startup-command-center.tsx`)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `isStartupProject()` (local guard) | `isRecord(value.companyContext)` — structural check only | No field changes |
| `StartupBuilderHome` (project card list) | `project.companyContext.name` — displayed as card title | Access from tower identity layer |
| `StartupBuilderWorkspace` (sidebar header) | `project.companyContext.name` — `<h2>` heading | Access from tower identity layer |
| `StartupBuilderWorkspace` (sidebar thread) | `project.companyContext.promise` — body text of "CompanyContext compiled" thread item | Access from tower positioning layer |
| `StartupBuilderWorkspace` (main header) | `project.companyContext.name` — subtitle below file/artifact path | Access from tower identity layer |

---

## 7. Conversation hook (`apps/web/src/components/startup-os/use-startup-conversation.ts`)

No direct `CompanyContext` field access. The hook communicates with the API entirely through the
`projectId` string and SSE events. **No change needed for field access** — the hook is opaque to
the tower shape.

---

## 8. API routes (`apps/web/src/app/api/startup-os/`)

### `projects/route.ts` (POST)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `auditLogger.log()` | `saved.project.companyContext.name` — `resource.name` in the audit log | Access from tower identity layer |

### `projects/[projectId]/review/route.ts` (POST)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `auditLogger.log()` (approved) | `saved.project.companyContext.name` — `resource.name` | Access from tower identity layer |

### `projects/[projectId]/chat/route.ts` (POST)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `auditLogger.log()` (completed) | `saved.project.companyContext.name` — `resource.name` | Access from tower identity layer |
| `auditLogger.log()` (failed) | `result.project.companyContext.name` — `resource.name` | Access from tower identity layer |

### `projects/[projectId]/runs/[runId]/execute/route.ts` (POST)

| Symbol | Fields read | Change needed |
|--------|-------------|---------------|
| `auditLogger.log()` (executed/failed) | `saved.project.companyContext.name` — `resource.name` | Access from tower identity layer |

### `projects/[projectId]/route.ts` (GET)
### `projects/[projectId]/files/route.ts` (GET + PATCH)
### `projects/[projectId]/canvas/route.ts` (PATCH)

No direct `CompanyContext` field reads. These routes pass the `project` object to store
functions but do not destructure `companyContext` themselves. **No direct change needed.**

---

## 9. Unit tests (`apps/web/src/lib/startup-os/__tests__/`)

### `compiler.test.ts`

| Test / assertion | Fields asserted | Change needed |
|-----------------|-----------------|---------------|
| "turns a startup thesis…" | `companyContext.category`, `companyContext.market` | Update to reach into the tower layer that holds `category` and `market` |
| "keeps the company promise grounded…" | `companyContext.promise` (equality check) | Update to reach into the tower positioning layer |
| "keeps explicit Startup Agent OS naming…" | `companyContext.name` | Update to tower identity layer |

### `files.test.ts`

| Test / assertion | Fields asserted | Change needed |
|-----------------|-----------------|---------------|
| `rootRoute?.content` contains `project.companyContext.name` | `companyContext.name` | Update assertion to match new tower path in generated file |
| `buildStartupPreviewHtml` contains `project.companyContext.name` / `.promise` | `companyContext.name`, `companyContext.promise` | Update assertions to the tower layer |
| `html` contains `.promise` text | `companyContext.promise` | Same — tower positioning layer |

### `store.test.ts`

| Test / assertion | Fields asserted | Change needed |
|-----------------|-----------------|---------------|
| "normalizes legacy fallback company copy…" | Sets `companyContext.promise` directly in fixture (`legacyProject`), asserts `parsed.project.companyContext.promise` | Fixture construction and assertion must both use tower path |
| All `saveStartupProject` / `getStartupProjectRecord` round-trips | Pass whole `project` (no field-level assertion on `companyContext`) | No change needed unless normalization function signature changes |

### `conversation.test.ts`

No field-level `companyContext` assertions. The streamer receives the prompt string wholesale.
**No change needed.**

### `execution.test.ts`

| Test / assertion | Fields asserted | Change needed |
|-----------------|-----------------|---------------|
| `request.prompt` contains `project.companyContext.name` | `companyContext.name` (via `toContain`) | Update `toContain` assertion to use the value string (unchanged) but be aware the path changes |

### `canvas.test.ts`, `feature-flag.test.ts`, `model-tier.test.ts`, `rollout.test.ts`

No direct `CompanyContext` field reads. **No change needed.**

---

## 10. API route tests (`apps/web/src/app/api/startup-os/`)

### `[projectId]/route.test.ts`

No `companyContext` field assertions. **No change needed.**

### `[projectId]/canvas/route.test.ts`

No `companyContext` field assertions. **No change needed.**

### `[projectId]/files/route.test.ts`

| Test / assertion | Fields asserted | Change needed |
|-----------------|-----------------|---------------|
| `payload.previewHtml` contains `project.companyContext.name` | `companyContext.name` (via `toContain`) | Update assertion value once tower is in place (the string value is unchanged) |
| `payload.previewHtml` contains `project.companyContext.promise` | `companyContext.promise` (via `toContain`) | Same |

### `[projectId]/chat/route.test.ts`

No `companyContext` field assertions. Audit mock is checked by action string and resource type,
not by name value. **No change needed.**

### `[projectId]/runs/[runId]/execute/route.test.ts`

No `companyContext` field assertions. **No change needed.**

---

## 11. Flat field access summary

| Flat field | Total sites | Files |
|------------|-------------|-------|
| `name` | 14+ | `compiler.ts` × 4, `store.ts` × 2, `files.ts` × 4, `startup-command-center.tsx` × 4, `projects/route.ts`, `review/route.ts`, `chat/route.ts` × 2, `execute/route.ts`, `compiler.test.ts`, `execution.test.ts`, `files/route.test.ts` |
| `promise` | 8+ | `compiler.ts` × 3 (normalizeStartupProjectCopy, buildArtifacts payload, buildSignals), `files.ts` × 3 (readme, indexRouteContent indirect, buildStartupPreviewHtml regex), `startup-command-center.tsx`, `compiler.test.ts`, `store.test.ts`, `files/route.test.ts` |
| `category` | 2 | `compiler.ts` × 2 (buildCompanyContext, buildArtifacts payload), `compiler.test.ts` |
| `market` | 2 | `compiler.ts` × 2 (detectMarket → buildCompanyContext, buildArtifacts payload), `compiler.test.ts` |
| `coreBet` | 1 | `compiler.ts` (buildCompanyContext + buildArtifacts payload) |
| `moat` | 1 | `compiler.ts` (buildCompanyContext only — not surfaced elsewhere) |
| `operatingModel` | 1 | `compiler.ts` (buildCompanyContext only — not surfaced elsewhere) |

---

## 12. Key invariants for the rewrite

1. **`project.companyContext.name`** is the most widely read field (14+ sites). Whatever tower
   layer it lives in, it must remain cheaply accessible — consider a top-level getter or a
   `displayName` computed property on the tower root.

2. **`project.companyContext.promise`** is the second most read field (8+ sites). It drives the
   sidebar thread item, the readme, the preview HTML regex parser, the legacy normalizer, and
   the Thesis clarity signal score.

3. **`companyContext` wholesale serialisation** occurs in two places:
   - `buildStartupConversationPrompt()` in `conversation.ts`
   - `buildStartupRunPrompt()` in `execution.ts`
   Both stringify the entire `project.companyContext` object directly into the LLM prompt. The
   nine-layer tower will change what the model sees — the system-prompt text describing
   `CompanyContext` must be updated in sync.

4. **`companyContextTs()` in `files.ts`** serialises `project.companyContext` into the
   generated `src/lib/company-context.ts` file. The index route (`src/routes/index.tsx`)
   imports `companyContext.name` and `companyContext.promise` from that generated file. If the
   tower nests these under sub-layers, the generated import paths and JSX accessors must be
   updated, AND the regex in `buildStartupPreviewHtml` (`readCompanyContextField`) must be
   updated to match the new JSON shape.

5. **`saveStartupProjectRecord()` canvas row name** (`store.ts`) reads
   `project.companyContext.name` to populate the `atelierCanvas.name` display column. Must
   stay a single flat string — just re-point to the tower's identity layer.

6. **Structural guard in `isStartupOSProject()`** — only checks `isRecord(value.companyContext)`.
   This will keep working as long as `companyContext` is an object. No field-level change needed.

7. **Audit log `resource.name`** appears in 4 API routes reading `project.companyContext.name`.
   These do not affect the wire API shape — only the access path changes.

8. **`moat` and `operatingModel`** are only set in `buildCompanyContext()` and only appear in
   the `operatingModel` payload array in `buildArtifacts()`. No consumer outside `compiler.ts`
   reads them directly. They are the lowest-blast-radius fields in the migration.
