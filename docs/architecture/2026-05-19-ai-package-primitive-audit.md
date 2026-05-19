# packages/ai — Duplicate-Primitive / Semantic-Drift Audit (2026-05-19)

> **Scope of this document:** a *read-only* governance audit of `packages/ai/*`
> (39 packages). It identifies where the same **fact / primitive** exists in
> more than one package, classifies each as *extractable duplicate* vs
> *principled-distinct boundary*, names the correct single owner, and specifies
> how to lock the boundaries.
>
> **Follow-up status:** the package manifest churn that originally blocked
> rewiring has cleared. The extractable pure helpers are now owned by
> `@nebutra/ai-primitives`; this document remains the boundary ledger for what
> was merged and what must stay separate.

## 1. Method

Every candidate was confirmed by reading the **real source body**, not symbol
names — several files (`code-index/src/interfaces.ts`,
`knowledge-graph/src/interfaces.ts`) trip grep's binary heuristic via
box-drawing chars and were read in full. "Identical" means byte-equivalent
logic; "drifted" means same fact with an unprincipled divergence; "different"
means a real principled distinction (must NOT be merged).

## 2. Duplication ledger

| # | Primitive / fact | Defined in (file:line) | Status | Verdict |
|---|---|---|---|---|
| 1 | `cosineSimilarity(a,b)` | `knowledge-graph/src/interfaces.ts` (`cosineSimilarity`) · `knowledge-rag/src/scoring.ts:14` | **DRIFTED** — same core (`Σ`, `na/nb===0 ⇒ 0`); divergent boundary policy: KG returns `0` on empty **and** on length-mismatch (fail-safe); KR **throws `KnowledgeRagError E_DIM_MISMATCH`** on mismatch (fail-loud), no empty early-return | EXTRACT → owner, with explicit `onMismatch: "zero" \| "throw"` (default `"zero"`); KR passes `"throw"` to preserve its fail-loud contract |
| 2 | `sha256(input)` | `code-index/src/interfaces.ts` · `knowledge-graph/src/interfaces.ts:65` | **IDENTICAL** — byte-for-byte `createHash("sha256").update(input,"utf8").digest("hex")` | EXTRACT → owner (zero-judgment fact; no reason for two copies) |
| 3 | Tenant-scoped opaque key derive — `collectionKey({tenantId,project})→ci_<sha256[:32]>` · `sourceScope({tenantId,source})→kg_<sha256[:32]>` | `code-index/src/interfaces.ts` · `knowledge-graph/src/interfaces.ts:49-63` | **DRIFTED** — identical algorithm (Zod `.trim().min(1)` fail-closed → `sha256(\`${a} ${b}\`).slice(0,32)` → branded string); differ only in prefix (`ci_`/`kg_`) + field label | EXTRACT the derivation as `scopedKey(prefix, a, b)`; **keep each package's branded type + prefix** (those are legitimately per-package — see §4) |
| 4 | `clamp(x,lo,hi)` = `Math.min(hi,Math.max(lo,x))` | `knowledge-graph/src/hybrid-fusion.ts:332` · `knowledge-graph/src/temporal-facts.ts:486` · `knowledge-rag/src/scoring.ts:54` | **IDENTICAL** ×3 (all private). NB `agents/src/context.ts:44` is a *string-truncation* `clamp` — **not** this fact | EXTRACT → owner (low-risk; bundle with the math primitives) |
| 5 | `estimateTokens` / chars-per-token | `agent-runtime/src/context-compaction.ts:172` (`ceil(base(text)*1.3)`, injectable base) · `agent-runtime/src/skills.ts:70` (bare `ceil(len/4)`) · `knowledge-graph/src/hybrid-fusion.ts` (`CHARS_PER_TOKEN=4`, *budget* constant) | **DRIFTED within agent-runtime** (rich vs bare copy); KG's is a *different concern* (char budget, not a token count) | EXTRACT the estimator → owner; `skills.ts` consumes it. **KEEP** KG's local budget constant (principled-distinct) |
| 6 | `knobsHash` / `fileHash` / `segmentHash` / `deriveId` | `knowledge-graph/src/interfaces.ts:258` · `code-index/src/interfaces.ts` | **DIFFERENT** — each folds different fields for a different purpose; only the underlying `sha256` is shared | KEEP-SEPARATE; they must consume the shared `sha256` (#2), nothing more |
| 7 | `normalizeScores`, `hybridBlend` (KR) vs RRF fusion (KG) | `knowledge-rag/src/scoring.ts:40,62` vs `knowledge-graph/src/hybrid-fusion.ts` | **DIFFERENT** — min-max-normalised weighted 2-leg *score* blend vs reciprocal-rank fusion of N *rank* lists + structural graph boosts | KEEP-SEPARATE + LOCK (see §4) |
| 8 | `Embedder` port | `code-index/src/interfaces.ts` (`+provider/modelId/dimension`) · `knowledge-rag/src/types.ts:72` (`+name`) | **DRIFTED metadata, same method** | KEEP-SEPARATE + LOCK — code-index's profile fields drive its drift-recreate invariant; merging over-couples |
| 9 | `VectorStore` (code-index) / `VectorStore` (knowledge-rag) / `VectorRetriever` (knowledge-graph) | `code-index/src/interfaces.ts` · `knowledge-rag/src/types.ts:78` · `knowledge-graph/src/interfaces.ts:228` | **DIFFERENT** (name collision only) — collection-lifecycle vs doc-scoped vs injection-seam | KEEP-SEPARATE + LOCK (see §4) |
| 10 | `getX()` singleton seam | `code-index/src/provider.ts` · `knowledge-graph/src/provider.ts` · `knowledge-rag/src/index.ts` · `provider-registry` | **PATTERN, not impl dup** — different bodies + different fail-mode (throw-NotConfigured vs zero-config default) | NO ACTION — recurring documented house pattern, intentionally so |
| 11 | local hash embedder (`embedTextLocal`) | `local-embedding/src/index.ts` (sole owner); `knowledge-rag/src/embedder.ts:12` **imports** it | **NOT duplicated** | NONE — this is the **exemplar** end-state to replicate elsewhere |
| 12 | chunking | `knowledge-rag/src/chunker.ts` · `code-index/src/chunker.ts` · `content-store/src/index.ts:134` | **DIFFERENT** (prose-window / code-structural / paragraph) | KEEP-SEPARATE |
| 13 | `slugify`/`normalize*`/`idFrom` | `founder-cemetery`,`play-loader`,`brand-genesis`,`tool-registry`,`knowledge-base` | **DIFFERENT** (bespoke per-domain rules; `knowledge-base.idFrom` is a slug, not a hash) | KEEP-SEPARATE |

No cross-package dup for: debounce, backoff/retry, prompt-injection pattern set, `dotProduct`/`magnitude`.

## 3. Single owner

**Recommended: a new zero-dependency leaf `@nebutra/ai-primitives`** owning
exactly the extractable facts: `sha256`, `cosineSimilarity(…, {onMismatch})`,
`clamp`, `scopedKey(prefix, a, b)`, `estimateTokens(text, {base?, correction})`.

Dependency analysis:

- `@nebutra/local-embedding` is the only true zero-dep leaf today (deps `{}`),
  already imported by `content-store` + `knowledge-rag`, and is the *exemplar*
  of correct single-ownership (#11). It is the **acceptable pragmatic
  fallback** owner, but `sha256` / `scopedKey` are not embedding concerns —
  hosting them there stretches its charter ("deterministic zero-config local
  embedding semantics").
- Rejected: `provider-registry` (deps `capability-kit`+`errors`; wrong
  charter), `ai-providers` ("metadata only" charter), `knowledge-rag` (deps
  `agents`/`search` → would create cycles, since `code-index`/`knowledge-graph`
  would then depend on a heavy node), `knowledge-graph`/`code-index` (domain
  packages, not primitive leaves).
- A new `@nebutra/ai-primitives` (deps: none + `zod` catalog for `scopedKey`'s
  fail-closed schema) creates **no cycle** (consumed only; imports nothing
  internal) and keeps each package's "no FS/DB/vendor, dependency-light"
  constraint intact — that constraint MUST be preserved by the owner.

## 4. Principled boundaries that must NOT be merged (lock these)

Each is a real architectural distinction; a "tidy" merge would be a regression.
State the principle so a future merge attempt is self-evidently wrong:

- **`code-index ≠ knowledge-graph`** — indexed unit differs: AST *code
  symbols* vs typed *prose entities + bitemporal facts*. `knowledge-graph`
  consumes a vector signal **only through its injected `VectorRetriever`
  port**, never `code-index` directly (its module header already documents "no
  hard dependency either way"). Principle: *different indexed unit; coupling is
  via port, not package.*
- **RRF 秩融合 ≠ weighted score blending** (#7) — `knowledge-rag`
  fuses two **scores** (min-max normalize + weighted blend); `knowledge-graph`
  fuses N **rank** lists (RRF) plus graph-structural boosts a flat store
  cannot compute. Principle: *score-fusion vs rank+structure-fusion are
  different algorithms, not a refactor target.*
- **三套 chunker 不合并** (#12) — `knowledge-rag` owns prose-window chunking,
  `code-index` owns code-structural chunking, and `content-store` owns
  paragraph/file-truth chunking. Principle: *input domain differs; only shared
  file-truth helpers belong in `content-store`.*
- **The three `VectorStore`/`VectorRetriever` ports** (#9) — collection-
  lifecycle (`ensure/recreate/upsert/deleteByFilePath`, `CollectionKey`) vs
  doc-scoped (`queryByVector(tenantId,…)/deleteByDoc`) vs injection-seam
  (`retrieve+keyword+embed`, `SourceScope`). Principle: *different
  lifecycle/ownership model per package; unifying the type would force a
  lowest-common-denominator that breaks code-index's drift-recreate
  invariant.*
- **`Embedder` metadata** (#8) — `code-index` needs `provider/modelId/dimension`
  for embedding-profile-drift detection; `knowledge-rag` needs only `name`.
  Principle: *the `embed()` method is shared (could type-alias post-extraction
  if ever desired), the metadata is invariant-bearing and package-specific.*
- **Branded scope types** (#3) — `CollectionKey` (`ci_`) and `SourceScope`
  (`kg_`) must stay distinct nominal types so a code-index key can never be
  passed to a knowledge-graph store. Only the *derivation* is shared; the
  *types* are a deliberate type-safety boundary.

## 5. Why execution is deferred (honest constraint, not avoidance)

`git status --porcelain packages/ai` shows **every** `packages/ai/*/package.json`
modified ` M` by concurrent same-author sessions (a linter/normalizer pass:
license → `AGPL-3.0-only`, added `nebutra.surface`). The extractable-duplicate
fix is two steps: (a) move the fact to the owner — safe (the `.ts` sources of
the implicated packages are NOT modified); (b) rewire each consumer, which
**requires editing its `package.json`** to add the owner dependency — this
collides head-on with the in-flight normalization and is exactly the
multi-session hazard (silent overwrite) we are required to avoid.

A partial extract that creates the owner but cannot rewire (and cannot delete
the dupes, since the consumer would then fail to compile without the dep)
would be *worse* than documented debt — it would be the "假整齐" the
governance brief forbids. Therefore the correct action now is: **publish this
audit as the binding contract**, and execute when the `package.json` churn is
quiescent (or coordinated with the owning session).

## 6. Locking plan (for the executor — not done here)

When the tree is quiescent:

1. Create `@nebutra/ai-primitives` (zero-dep + `zod` catalog) with the five
   facts in §3, full TDD, faithful to the drift notes in §2 (esp. #1's
   `onMismatch` and #5's injectable base + `1.3` correction).
2. Rewire consumers (`code-index`, `knowledge-graph`, `knowledge-rag`,
   `agent-runtime`) to import them; delete the local copies; keep each
   package's branded scope type + prefix (§4).
3. Add `tests/architecture/ai-primitive-ownership.test.ts` — a **ratchet**:
   an explicit allowlist of remaining legacy copies (empty after step 2) such
   that *any* new in-`packages/ai` redefinition of `sha256` /
   `cosineSimilarity` / `scopedKey` / a chars-per-token estimator fails CI.
   Encode the §4 boundaries as asserted facts so a future "merge the knowledge
   packages" PR trips the test with the stated principle in the message.
4. Do NOT touch `tests/architecture/ai-package-governance.test.ts` (separate
   session's file) — use the new filename above to avoid collision.

## 7. Bottom line

- **Real, extract-now-when-safe duplicates (single owner):** `sha256`,
  `cosineSimilarity` (policy-parameterized), `clamp`, `scopedKey` derivation,
  `estimateTokens`. ~5 facts, all pure, no principled reason to duplicate.
- **Principled-distinct (lock, never merge):** the four knowledge/retrieval
  package boundaries, the three vector ports, the branded scope types, the two
  fusion algorithms, the three chunkers. The overlap is *nominal*, not
  semantic.
- **Exemplar to copy:** `@nebutra/local-embedding` (one owner, others import).
- **Net:** the only genuine debt is ~5 copied pure helpers; the knowledge
  package sprawl is mostly principled separation, not drift — it must be
  *locked*, not *merged*.
