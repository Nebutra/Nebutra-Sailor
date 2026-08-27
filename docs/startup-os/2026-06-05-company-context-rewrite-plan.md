# Company Context Tower — Flat→Tower Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `interface CompanyContext` (and its hardcoded regex compiler) with the already-built nine-layer tower as the source of truth, projecting a flat view for the few consumers that need top-level `name`/`promise`.

**Architecture:** The tower (`apps/web/src/lib/startup-os/company-context/`, committed in `a1514c5c`) is the source of truth. A new pure `projection.ts` derives a `FlatCompanyView` (the old 7-field shape) from the tower. Every consumer reads through projection helpers; the generated scaffold + preview regex + LLM prompts consume the flat view, so their wire/text shapes are unchanged. `compileStartupProject` seeds the tower via the keyless-injectable `compileTowerFromThesis`.

**Tech Stack:** TypeScript (strict), Zod, Vitest, Biome. Keyless-testable (injected `invokeModel`). Commit straight to `main` with `git commit -- <files>`.

**Locked field mapping** (decided 2026-06-05):

| flat field | tower location | projection helper |
|---|---|---|
| `name` | **L8.identity `name`** (NEW seed, `line`, required) | `companyName(ctx)` |
| `promise` | L5.product `value_proposition` | `valueProposition(ctx)` |
| `category` | L4.strategy `category` | `companyCategory(ctx)` |
| `market` | **L6.users `market`** (NEW seed, `line`) | `companyMarket(ctx)` |
| `coreBet` | L1.essence `why` | `companyCoreBet(ctx)` |
| `moat` | L4.strategy `moat` | `companyMoat(ctx)` |
| `operatingModel` | L3.principles `operating_principles` | `operatingPrinciples(ctx)` |

**⚠️ Multi-session note (updated 2026-06-05):** A second session built the **Match-Your-Cofounder** surface on top of the tower foundation (`6478450d`, `075d71d6`) — including `apps/web/src/app/[locale]/(app)/cofounder/page.tsx`, now a LIVE consumer of `companyContext.name/.promise/.category` (Task 8b). **Re-derive the consumer list before Task 3:** `rg "companyContext\.(name|promise|category|market|coreBet|moat|operatingModel)" apps/web/src --glob '!**/company-context/**'`. **Tasks 1–2 are collision-safe** (new file + own-module). **Tasks 3–8b edit shared `startup-os` + cofounder files** — coordinate with that session before executing; use `git commit -- <files>`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `company-context/projection.ts` *(new)* | Tower → `FlatCompanyView` + per-field read helpers | 1 |
| `company-context/registry.ts` *(mod)* | Add L8 `name` (required) + L6 `market` seed fields | 2 |
| `startup-os/compiler.ts` *(mod)* | Re-type `CompanyContext` to tower; `compileStartupProject` seeds tower; `buildArtifacts`/`buildSignals`/`normalizeStartupProjectCopy` read via projection; delete `buildCompanyContext`/`detectMarket`/`titleFromThesis`/`normalizePromise` | 3 |
| `startup-os/store.ts` *(mod)* | `saveStartupProjectRecord` canvas name via `companyName()` | 4 |
| `startup-os/files.ts` *(mod)* | `companyContextTs` emits `flatCompanyView`; package/root/readme/index via projection | 5 |
| `startup-os/conversation.ts` + `execution.ts` *(mod)* | Prompts embed `flatCompanyView`; update system-prompt doc text | 6 |
| `components/startup-os/startup-command-center.tsx` *(mod)* | 5 reads (3×name + 2×promise) via projection | 7 |
| `app/api/startup-os/**` *(mod ×4)* | Audit `resource.name` via `companyName()` | 8 |
| `startup-os/canvas.ts` *(mod)* | Canvas node `title`=name, `subtitle`=category via projection | 8a |
| `app/[locale]/(app)/cofounder/page.tsx` *(mod)* | Cofounder card name/oneLiner/category via projection (OTHER session's file) | 8b |
| `startup-os/__tests__/*` *(mod)* | Update fixtures/assertions to tower path | per-task |

---

## Task 1 — `projection.ts` (NEW, collision-safe)

> **Run Task 2 FIRST.** This task's test upserts `L8.name`, and `upsertField` throws on unknown fields (`repository.ts:174`). The `name` seed must exist before the projection test can set it. (Tasks 1 & 2 are both collision-safe; execute 2 → 1.)

**Files:**
- Create: `apps/web/src/lib/startup-os/company-context/projection.ts`
- Test: `apps/web/src/lib/startup-os/company-context/__tests__/projection.test.ts`

- [ ] **Step 1: Write the failing test** (`projection.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { createEmptyContext, InMemoryCompanyContextRepository } from "../repository";
import { companyName, valueProposition, flatCompanyView } from "../projection";

async function ctxWith(layerId: string, fieldKey: string, value: unknown) {
  const repo = new InMemoryCompanyContextRepository();
  await repo.save(createEmptyContext("p1", "pre_seed", "2026-06-05T00:00:00.000Z"));
  await repo.upsertField("p1", layerId as never, fieldKey, value, { provenance: "user", now: "2026-06-05T00:00:00.000Z" });
  return repo.get("p1");
}

describe("projection", () => {
  it("reads company name from L8.name, falls back when empty", async () => {
    expect(companyName(await ctxWith("L8", "name", "Sailor"))).toBe("Sailor");
    const empty = createEmptyContext("p2", "pre_seed", "2026-06-05T00:00:00.000Z");
    expect(companyName(empty)).toBe("Nebutra Venture"); // default, never empty string
  });

  it("reads promise from L5.value_proposition", async () => {
    expect(valueProposition(await ctxWith("L5", "value_proposition", "Compile a company"))).toBe("Compile a company");
  });

  it("flatCompanyView returns the legacy 7-field shape", async () => {
    const view = flatCompanyView(await ctxWith("L8", "name", "Sailor"));
    expect(Object.keys(view).sort()).toEqual(
      ["category", "coreBet", "market", "moat", "name", "operatingModel", "promise"].sort(),
    );
    expect(view.name).toBe("Sailor");
    expect(Array.isArray(view.operatingModel)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — `pnpm --filter @nebutra/web exec vitest run src/lib/startup-os/company-context/__tests__/projection.test.ts` → FAIL `Cannot find module '../projection'`.

- [ ] **Step 3: Implement `projection.ts`**

```ts
import type { CompanyContext, LayerId } from "./model";

/** Default surfaced when a layer/field is empty — never return an empty string. */
const DEFAULT_NAME = "Nebutra Venture";
const DEFAULT_PROMISE = "A company workspace compiled from the submitted proposition.";

function rawValue(ctx: CompanyContext, layerId: LayerId, fieldKey: string): unknown {
  return ctx.layers[layerId]?.values[fieldKey]?.value;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asStringList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function companyName(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L8", "name")) ?? DEFAULT_NAME;
}
export function valueProposition(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L5", "value_proposition")) ?? DEFAULT_PROMISE;
}
export function companyCategory(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L4", "category")) ?? "";
}
export function companyMarket(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L6", "market")) ?? "";
}
export function companyMoat(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L4", "moat")) ?? "";
}
export function companyCoreBet(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L1", "why")) ?? "";
}
export function operatingPrinciples(ctx: CompanyContext): readonly string[] {
  return asStringList(rawValue(ctx, "L3", "operating_principles"));
}

/** The legacy flat CompanyContext shape, derived from the tower. Consumed by the
 *  generated scaffold, the preview regex, and LLM prompts (compact + stable). */
export interface FlatCompanyView {
  readonly name: string;
  readonly promise: string;
  readonly category: string;
  readonly market: string;
  readonly moat: string;
  readonly coreBet: string;
  readonly operatingModel: readonly string[];
}

export function flatCompanyView(ctx: CompanyContext): FlatCompanyView {
  return {
    name: companyName(ctx),
    promise: valueProposition(ctx),
    category: companyCategory(ctx),
    market: companyMarket(ctx),
    moat: companyMoat(ctx),
    coreBet: companyCoreBet(ctx),
    operatingModel: operatingPrinciples(ctx),
  };
}
```

- [ ] **Step 4: Run test, verify it passes** — same command → PASS.
- [ ] **Step 5: Biome + commit** — `pnpm --filter @nebutra/web exec biome check --write src/lib/startup-os/company-context/projection.ts src/lib/startup-os/company-context/__tests__/projection.test.ts` then `git commit -- apps/web/src/lib/startup-os/company-context/projection.ts apps/web/src/lib/startup-os/company-context/__tests__/projection.test.ts -m "feat(startup-os): tower→flat projection helpers for company context"`.

---

## Task 2 — Add `name` (L8) + `market` (L6) seed fields (own-module, near-safe)

**Files:**
- Modify: `apps/web/src/lib/startup-os/company-context/registry.ts`
- Modify: `apps/web/src/lib/startup-os/company-context/__tests__/registry.test.ts`

- [ ] **Step 1: Update the test first** — in `registry.test.ts`, add assertions:

```ts
it("L8 seeds a required name field (company identity label)", () => {
  const l8 = getSeedFields("L8");
  const name = l8.find((f) => f.key === "name");
  expect(name).toMatchObject({ key: "name", kind: "line", required: true });
});
it("L6 seeds a market field", () => {
  expect(getSeedFields("L6").some((f) => f.key === "market" && f.kind === "line")).toBe(true);
});
```

- [ ] **Step 2: Run, verify fail** — `... vitest run .../registry.test.ts` → FAIL (no `name`/`market`).

- [ ] **Step 3: Add the seeds** in `registry.ts` `SEED_FIELDS`:
  - L8 — prepend `field("name", "Company name", "line", true),` as the first entry of the `L8` array.
  - L6 — add `field("market", "Market", "line"),` to the `L6` array.

- [ ] **Step 4: Run, verify pass** — `registry.test.ts` GREEN. **Also update the existing `registry.test.ts` "required-field set per layer" assertion** (the test building `requiredByLayer = { L1:["mission"], L4:["positioning"], L5:["jtbd"], L6:["icp"] }` and asserting every layer's actual required set with L8 expected `[]`): adding L8 `name` as required makes L8's required set `["name"]`, so add `L8: ["name"]` to the expected map or the test fails. Then run the whole dir `... vitest run src/lib/startup-os/company-context`. (Empty-L8 manifest stays `completeness:0`/`status:"empty"` regardless — no `completeness.test.ts` change needed.)

- [ ] **Step 5: Biome + commit** — `git commit -- apps/web/src/lib/startup-os/company-context/registry.ts apps/web/src/lib/startup-os/company-context/__tests__/registry.test.ts -m "feat(startup-os): seed L8 name + L6 market tower fields"`.

---

> **GATE — STOP HERE until the other `startup-os` session is finished.** Tasks 3–9 edit files that session is actively changing. Re-check `git log --oneline -5` and `git status` before continuing. Run these as a single Workflow once the window is clear, in this order (compiler first — it re-types `CompanyContext`, which the rest depend on).

---

## Task 3 — `compiler.ts` (SHARED, deferred)

**Files:** Modify `apps/web/src/lib/startup-os/compiler.ts`; Modify `apps/web/src/lib/startup-os/__tests__/compiler.test.ts`.

**Changes:**
- [ ] Replace `export interface CompanyContext { ... }` with `export type { CompanyContext } from "./company-context/model";` (re-export the tower type so `StartupOSProject.companyContext` and all importers transparently switch).
- [ ] Delete `buildCompanyContext`, `detectMarket`, `titleFromThesis`, `normalizePromise`, `LEGACY_PROMISE_MARKER`, `normalizeWords` (regex heuristics — root-cause removal).
- [ ] In `compileStartupProject`: replace `const context = buildCompanyContext(thesis, input.arena)` with `const context = await compileTowerFromThesis({ projectId: id, thesis, stage: "pre_seed", now })` (make `compileStartupProject` `async`, or keep sync by adding a sync keyless seeder — prefer async; update callers). Seed the company name: after compile, `upsertField(L8,"name", titleless-default-or-thesis-derived, {provenance:"ai"|"user"})` — keyless default may leave `name` empty (projection falls back to default). Keep `slug` derivation from `companyName(context)`.
- [ ] `buildArtifacts(slug, thesis, context)` — replace `context.name`→`companyName(context)`, `context.category`→`companyCategory(context)`, `context.market`→`companyMarket(context)`, `context.coreBet`→`companyCoreBet(context)` (import from `./company-context/projection`).
- [ ] `buildSignals(context)` — replace `context.promise.length` with `valueProposition(context).length`.
- [ ] `normalizeStartupProjectCopy` — the legacy-promise marker guard is obsolete (regex removed); delete the function or reduce to identity. Remove its call sites and the `store.ts`/test references (see Task 4/9).
- [ ] **Tests** (`compiler.test.ts`) — these change BEHAVIOR, not just access path (keyless compile no longer runs regex heuristics):
  - `.category`/`.market`: keyless compile leaves these EMPTY (no more `detectMarket`) → assert `companyCategory(...) === ""` / `companyMarket(...) === ""`, OR drive an injected `invokeModel` fixture that fills them and assert that.
  - `.promise` (old: thesis WITH a trailing "."): verbatim seeding stores the thesis as-is → assert `valueProposition(...)` equals the thesis WITHOUT the added "." (drop the `normalizePromise` expectation).
  - `.name` / "Startup Agent OS naming" (old: `=== "Startup Agent OS"` via `titleFromThesis`): keyless compile does NOT set L8.name → `companyName(...)` returns the default `"Nebutra Venture"`. Rewrite the test to assert the default, OR inject an `invokeModel` that sets L8.name and assert that. Do NOT resurrect `titleFromThesis`.
  - `slug` (old: `"nebutra-ai-saas"` from name): slug now derives from the default name → update the expected slug, or seed L8.name in the fixture first.

**Note:** `compileStartupProject` becoming `async` ripples to `projects/route.ts` POST and any caller — grep `compileStartupProject(` and `await` them. Verify with route tests.

## Task 4 — `store.ts` (SHARED, deferred)
- [ ] `saveStartupProjectRecord`: replace both `project.companyContext.name` reads (atelierCanvas create/update `name`) with `companyName(project.companyContext)`.
- [ ] `store.test.ts` "normalizes legacy fallback company copy" — legacy promise normalization is gone (Task 3); delete or rewrite this test to seed `value_proposition` via the tower and assert round-trip.

## Task 5 — `files.ts` (SHARED, deferred — the regex-sensitive one)
- [ ] `companyContextTs(project)`: change `JSON.stringify(project.companyContext, null, 2)` → `JSON.stringify(flatCompanyView(project.companyContext), null, 2)`. **This keeps top-level `name`/`promise` in the emitted file** so `index.tsx` (`companyContext.name`/`.promise`) and the `readCompanyContextField` regex keep working unchanged.
- [ ] `packageJsonContent`, `rootRouteContent`, `readme` (×name, ×promise): replace `project.companyContext.name`→`companyName(project.companyContext)`, `project.companyContext.promise`→`valueProposition(project.companyContext)`.
- [ ] `indexRouteContent` is indirect (reads the generated file at runtime) — no change once `companyContextTs` emits the flat view.
- [ ] `files.test.ts` — assertions on generated `name`/`promise` use literal value strings (unchanged); update only if a fixture built a flat `companyContext` object — switch fixtures to `createEmptyContext` + `upsertField` (or a shared `towerFixture()` test helper).

## Task 6 — `conversation.ts` + `execution.ts` (SHARED, deferred)
- [ ] `buildStartupConversationPrompt` (`conversation.ts:168`): `companyContext: project.companyContext` → `companyContext: flatCompanyView(project.companyContext)`.
- [ ] `buildStartupRunPrompt` (`execution.ts:196`): same replacement.
- [ ] Update `CONVERSATION_SYSTEM_PROMPT` (`conversation.ts:125`) doc text describing the `companyContext` shape if it enumerates fields (keep it the flat 7 keys — unchanged for the model).
- [ ] `execution.test.ts` `request.prompt` `toContain(name)` assertion — value unchanged, passes; verify.

## Task 7 — `startup-command-center.tsx` (SHARED, deferred)
- [ ] 3× `project.companyContext.name` (lines ~1043 home card title, ~1133 sidebar `<h2>`, ~1212 main header subtitle) → `companyName(project.companyContext)`.
- [ ] 2× `project.companyContext.promise` (lines ~1109 sidebar thread body, ~1145 main subtitle/preview) → `valueProposition(project.companyContext)`.
- [ ] Import the helpers from `@/lib/startup-os/company-context/projection` (match the file's existing import alias style).

## Task 8 — API routes ×4 (SHARED, deferred)
- [ ] `projects/route.ts:152`, `review/route.ts:103`, `chat/route.ts:233+253` (×2), `runs/[runId]/execute/route.ts:195`: every `…companyContext.name` used as audit `resource.name` → `companyName(…companyContext)`. Wire-API shape unchanged.

## Task 8a — `canvas.ts` (SHARED, deferred — missed by first blast-radius)
- [ ] `apps/web/src/lib/startup-os/canvas.ts:167-168`: `title: project.companyContext.name` → `title: companyName(project.companyContext)`; `subtitle: project.companyContext.category` → `subtitle: companyCategory(project.companyContext)`. Import from `./company-context/projection`.
- [ ] `canvas.test.ts` — if any assertion checks the node title/subtitle string, seed L8.name / L4.category via the tower fixture (or assert the projection default).

## Task 8b — `cofounder/page.tsx` (SHARED, deferred — OTHER session's file; coordinate!)
- [ ] `apps/web/src/app/[locale]/(app)/cofounder/page.tsx:47/49/50` reads `project.companyContext.name/.promise/.category` from fetched project JSON (the wire serializes the full tower). Replace with: `companyName(project.companyContext)`, `valueProposition(project.companyContext) || project.thesis || ""`, `companyCategory(project.companyContext)`. `projection.ts` is pure (no server-only deps) so it imports fine here.
- [ ] **Decision recorded:** the wire keeps serializing the full tower (single source of truth); browser/RSC consumers read via the pure projection helpers — NO separate flat wire field is added (avoids a parallel shape to keep in sync). **This file belongs to the cofounder-match session — confirm it is idle/merged before editing.**

## Task 9 — Full verification (SHARED, deferred)
- [ ] `pnpm --filter @nebutra/web exec vitest run src/lib/startup-os src/app/api/startup-os` → all green.
- [ ] `pnpm --filter @nebutra/web exec tsc --noEmit` → clean (catches missed `await compileStartupProject`).
- [ ] `pnpm lint` (Biome + the repo governance scripts) → clean.
- [ ] Grep guard: `rg "companyContext\.(name|promise|category|market|coreBet|moat|operatingModel)" apps/web/src --glob '!**/company-context/**'` returns **only** the generated JSX templates inside `files.ts` `indexRouteContent` (lines ~264-265: `{companyContext.name}` / `{companyContext.promise}` — JSX in the EMITTED child app, not live access), never live object access in the parent app.
- [ ] Commit per logical task with `git commit -- <files>`.

---

## Open questions / risks

1. **`compileStartupProject` async ripple** — the cleanest is async; confirm every caller (`projects/route.ts`) awaits. Alternative: a sync keyless seeder if any caller can't be async (it can).
2. **Company name seeding** — keyless compile leaves `name` empty (projection default `"Nebutra Venture"`). Acceptable for keyless/dev; the AI path (`invokeModel`) should fill L8.name. The old `titleFromThesis` regex is intentionally NOT resurrected (no-写死).
3. **`normalizeStartupProjectCopy` removal** — confirm no external import beyond compiler/store/tests before deleting.
4. **Generated preview parity** — after Task 5, regenerate a sample project's files and diff `company-context.ts` + the preview HTML to confirm `name`/`promise` still render (the flat view guarantees this, but verify once).
