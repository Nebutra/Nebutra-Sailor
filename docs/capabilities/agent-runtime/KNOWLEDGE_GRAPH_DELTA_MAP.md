# knowledge-graph delta map (P2) — 11th source

> Source (11th): a self-wiring "second brain for agents" knowledge engine
> (conversation-only; intentionally huge & marketing-heavy — only the
> reusable engineering design was extracted, all brand/accelerator/product
> names and unverified accuracy numbers discarded). Frame (consistent across
> 11 absorptions): **extend the absorbed grammar, translate ONLY the delta**.

## Governance decision (no new fork — established pattern applied)

The prior absorption established the rule: *a capability orthogonal to the
agent loop ⇒ its own package, vector retrieval injected*. A typed entity graph
+ a bitemporal fact ledger + graph-boosted retrieval is exactly such a
substrate (a search box / CRM-style query / RAG endpoint consumes it with no
agent present). So this became a new package **`@nebutra/knowledge-graph`**,
decoupled from `@nebutra/code-index` via the injected `VectorRetriever` port
(no hard dependency either way). This was a mechanical application of two
already-confirmed patterns, not a new governance fork — so it was not
re-asked.

## Map

| # | Capability | Verdict | Where |
|---|---|---|---|
| — | agent loop/turns/dispatcher/policy/tool+MCP/rollout/sandbox seam, skills, hook-pipeline, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, channel-gateway, inbound-admission, fuzzy-match, command-suggestions, permission-ruleset, session-share, code-review, context-compaction, commit-message | **SKIP** | already absorbed |
| — | `memory-provider` (pluggable cross-session memory + injection-defense scrubber) | **SKIP** | the LLM "hot memory" turn-extractor + `INJECTION_PATTERNS` sanitizer are exactly this — only the *deterministic* fence path is delta |
| — | `@nebutra/code-index` (semantic *code* vector index) | **SKIP** | pure embed-chunks + cosine = code-index; the delta is the fusion/graph layer ON TOP, taken via an injected port |
| — | cycle phase orchestration / locks / yield hooks, eval-harness (BrainBench/LongMemEval/capture), OAuth/access-token/request-log, Brier bet-calibration scorecard | **DROP** | agent-loop/hook-pipeline/subagent/eval/auth/ops infra — already absorbed or non-reusable domain noise |
| 1 | **Zero-LLM typed entity-edge extractor** — code-strip → 4 span-masked ref passes (source-qualified wikilink → wikilink → md-link → bare-slug) gated by a dir whitelist → edge-type inference with fixed precedence `founded>invested_in>advises>works_at>role-prior>mentions` (per-edge 240-char verb-regex window + whole-page role prior + page-type shortcuts) → flat `FRONTMATTER_LINK_MAP` (outgoing/incoming/dirHint) → injected resolver cascade; unresolved surfaced, never written as dead edges | **PORT** (headline) | `knowledge-graph/src/link-extraction.ts` |
| 2 | **Markdown-canonical bitemporal typed-fact model** — `## Facts` fence is system-of-record (10↔14 col widening, strict+lenient parse, malformed-row skip+warn, stable append-only rowNum, `~~strikethrough~~`+context supersession/forgotten), date-derivation precedence, `forgotten⇒valid_until=today` re-derivation invariant, metric normalization map+snake_case fallback, deny-by-default `stripFactsFence`, trajectory (regression threshold w/ zero-guard, drift score, stable additive `schemaVersion`) | **PORT** | `knowledge-graph/src/temporal-facts.ts` |
| 3 | **Idempotent consolidate** — eligibility gates, greedy cosine clustering (centroid = first member), highest-confidence take, semantic upsert key `(pageId,claim,sinceDate)` (never re-INSERT), chronological `valid_until` writeback, **observable no-op** (stable re-run ⇒ 0 rows affected), fail-closed legacy-rows guard | **PORT** (thin) | `knowledge-graph/src/consolidate.ts` |
| 4 | **Graph/backlink-boosted hybrid fusion** — keyword+N-vector lists → intent-tilted weighted RRF → max-normalize → compiled-truth ×2.0 → 0.7/0.3 RRF·cosine blend → floor-gated backlink/salience/recency boosts (head-only reorder invariant) → graph-expand `1/(1+hop)` decay → per-page cap + token budget → mode presets + knobs-hash-segmented cache | **WRAP** (over injected vector port) | `knowledge-graph/src/hybrid-fusion.ts` |

## Honest scope

- **Done (built + TDD-tested):** new package `@nebutra/knowledge-graph` —
  **151 tests green, package typecheck clean** (`link-extraction` 51,
  `temporal-facts` 38, `consolidate` 28, `hybrid-fusion` 34). Tenant+source
  scoped (`SourceScope` = tenantId+source, Zod-validated, no unscoped path;
  graph walk source-filters at seed/hop/join). Fail-closed: unresolved refs
  surfaced not written, fact visibility deny-by-default, retrieval throws
  `KnowledgeGraphNotConfiguredError` before configure, consolidate refuses the
  destructive pass while legacy rows exist. Markdown-canonical (DB is a
  rebuildable derived index; stable re-derive is a true no-op). All vendor /
  store / embedding seams host-injected (GraphStore / FactStore /
  VectorRetriever / EntityResolver / Clock) — zero bundled backend, decoupled
  from code-index by construction.
- **Deliberately not ported (not faked):** the LLM hot-memory turn-extractor &
  injection-pattern sanitizer (= absorbed `memory-provider`), the cycle
  scheduler/locks, the eval/benchmark harness, OAuth/MCP-log/auth tables, the
  Brier bet-calibration aggregate, and the entire brand/marketing surface
  (CHANGELOG/TODOS/README/skills/templates — including unverified accuracy
  numbers, which were not propagated).
- **Concurrency note:** the AI-package governance test &
  `capability-kit.test.ts` were being modified by a concurrent same-author
  session during this work; per multi-session discipline they were left
  untouched and only this package's explicit pathspecs were committed.
