// =============================================================================
// @nebutra/knowledge-rag — Agent tool factory
// =============================================================================
// Exposes the RAG pipeline as a tenant-scoped retrieval tool that
// @nebutra/agent-runtime / @nebutra/agents can register. This is the "real
// caller" that keeps the package at lifecycle tier `active`.
//
// The tenantId is bound at factory time (from the agent's tenant context) and
// is NEVER taken from model-generated arguments — preventing a tool-call from
// crossing tenant boundaries.
// =============================================================================

import { getKnowledgeRag } from "./index";
import type { KnowledgeRagConfig, RankedChunk } from "./types";

export interface KnowledgeRagToolResult {
  query: string;
  results: Array<{
    docId: string;
    chunkId: string;
    text: string;
    score: number;
    scores: RankedChunk["scores"];
    source: RankedChunk["source"];
    meta: Record<string, unknown>;
  }>;
}

export interface KnowledgeRagTool {
  name: "knowledge_search";
  description: string;
  /** Execute a tenant-scoped retrieval. tenantId is bound, not an argument. */
  execute(args: { query: string; topK?: number }): Promise<KnowledgeRagToolResult>;
}

/**
 * Build a knowledge-search tool bound to a single tenant.
 *
 * @param tenantId — resolved from the agent's tenant context
 *                    (e.g. getCurrentTenant().tenantId from @nebutra/tenant).
 */
export function createKnowledgeRagTool(
  tenantId: string,
  config?: KnowledgeRagConfig,
): KnowledgeRagTool {
  if (!tenantId) {
    // Fail fast — a tool without a tenant binding is a security hole.
    throw new Error(
      "createKnowledgeRagTool requires a tenantId. Resolve it from getCurrentTenant() (@nebutra/tenant) before constructing the tool.",
    );
  }
  return {
    name: "knowledge_search",
    description:
      "Search the tenant's knowledge base for passages relevant to a query. Returns ranked chunks with hybrid (vector + keyword) scores and source document IDs.",
    async execute(args) {
      const kb = await getKnowledgeRag(config);
      const ranked = await kb.query({
        query: args.query,
        tenantId,
        topK: args.topK ?? 5,
      });
      return {
        query: args.query,
        results: ranked.map((r) => ({
          docId: r.chunk.docId,
          chunkId: r.chunk.id,
          text: r.chunk.text,
          score: r.score,
          scores: r.scores,
          source: r.source,
          meta: r.chunk.meta as Record<string, unknown>,
        })),
      };
    },
  };
}
