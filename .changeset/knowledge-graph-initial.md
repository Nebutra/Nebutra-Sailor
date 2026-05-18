---
"@nebutra/knowledge-graph": minor
---

New package: multi-tenant self-wiring knowledge-graph substrate.

A zero-LLM typed entity-edge extractor (code-strip → span-masked reference
passes → fixed-precedence edge-type inference with a per-edge verb window plus
a whole-page role prior → flat frontmatter link map → injected resolver
cascade; unresolved references are surfaced, never written as dead edges). A
markdown-canonical bitemporal typed-fact model where a `## Facts` fence is the
system of record (column widening, strict + lenient parsing, malformed-row
skip, stable append-only row numbers, strikethrough supersession, date
derivation precedence, metric normalization with a snake_case fallback,
deny-by-default fence stripping, and a per-metric trajectory with regression
detection and a stable additive schema version). An idempotent consolidation
pass (greedy cosine clustering, highest-confidence promotion, semantic upsert
that never re-inserts, chronological supersession writeback) with an
observable no-op on stable input. A graph/backlink-boosted hybrid fusion stack
(intent-tilted weighted RRF → normalize → cosine blend → floor-gated
backlink/salience/recency boosts → graph expansion with hop decay → per-page
cap and token budget) with mode presets and a knobs-segmented cache.

Tenant + source scoped (Zod-validated, no unscoped path; the graph walk
source-filters at seed, every hop, and the final join) and fail-closed
(unresolved refs surfaced, fact visibility deny-by-default, retrieval throws
before configure, consolidation refuses to run while legacy rows exist).
Markdown is canonical — the store is a rebuildable derived index and stable
re-derivation is a true no-op. GraphStore, FactStore, VectorRetriever,
EntityResolver and Clock are all host-injected — no bundled backend, decoupled
from `@nebutra/code-index` via the injected vector port. 151 package tests.
