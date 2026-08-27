/**
 * @nebutra/code-index — multi-tenant codebase semantic-index grammar.
 *
 * A faithful re-expression of a coding agent's repo-indexing subsystem
 * (deterministic content-hash chunking, incremental hash-diff scan,
 * embedding-profile drift recreate, cosine retrieval) into Sailor's grammar:
 * TypeScript, multi-tenant (collection key = tenantId + project), fail-closed,
 * provider-agnostic Embedder/VectorStore ports, no native tree-sitter dep.
 */

export * from "./chunker";
export * from "./index-engine";
export * from "./interfaces";
export * from "./provider";
