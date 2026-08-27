/**
 * Built-in tool registry for agents.
 *
 * These are safe, tenant-scoped stubs that demonstrate the tool interface.
 * Each tool requires configuration (API keys, vector stores, etc.) before
 * it produces real results.
 */

import type { AgentTool } from "./types";

/** Search the web for current information. */
export const webSearchTool: AgentTool = {
  name: "web_search",
  description: "Search the web for current information",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  execute: async (_input, _context) => {
    return {
      results: [],
      note: "Configure TAVILY_API_KEY or SERPER_API_KEY for live search",
    };
  },
};

/** Query the tenant's database (tenant-scoped via RLS). */
export const databaseQueryTool: AgentTool = {
  name: "database_query",
  description: "Query the tenant's database",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  execute: async (_input, context) => {
    return {
      note: `Query would execute in tenant ${context.tenantId} scope`,
    };
  },
};

/** RAG-style knowledge base retrieval. */
export const knowledgeBaseTool: AgentTool = {
  name: "knowledge_base",
  description: "Search the organization's knowledge base for relevant documents",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number" },
    },
  },
  execute: async (_input, _context) => {
    return { documents: [], note: "Configure vector store for RAG" };
  },
};

/** All pre-built tools. */
export const BUILT_IN_TOOLS: readonly AgentTool[] = [
  webSearchTool,
  databaseQueryTool,
  knowledgeBaseTool,
];
