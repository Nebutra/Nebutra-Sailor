/**
 * @nebutra/knowledge-graph — multi-tenant self-wiring knowledge-graph substrate.
 *
 * A faithful re-expression of a "second brain for agents" engine's design into
 * Sailor's grammar: zero-LLM typed entity-edge extraction, a markdown-canonical
 * bitemporal typed-fact ledger with supersession + trajectory, idempotent
 * consolidation (observable no-op on stable input), and graph/backlink-boosted
 * hybrid fusion — all behind injected GraphStore/FactStore/VectorRetriever
 * ports. Decoupled from @nebutra/code-index (vector retrieval is injected).
 */

export * from "./consolidate";
export * from "./hybrid-fusion";
export * from "./interfaces";
export * from "./link-extraction";
export * from "./provider";
export * from "./temporal-facts";
