/**
 * Default agent configurations shipped with every tenant.
 *
 * Tenants can override or extend these via the dashboard.
 * The `tools` array references built-in tool names from @nebutra/agents/tools
 * that are resolved at runtime by the orchestrator.
 */

import type { MemoryConfig } from "@nebutra/agents";

/**
 * Declarative agent configuration used by the API layer.
 *
 * Tools are referenced by name (string) and resolved to actual AgentTool
 * instances by the orchestrator when the agent is instantiated.
 */
export interface DefaultAgentConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly model: string;
  readonly instructions: string;
  readonly tools?: readonly string[];
  readonly maxSteps: number;
  readonly memory: MemoryConfig;
}

export const DEFAULT_AGENTS: readonly DefaultAgentConfig[] = [
  {
    id: "assistant",
    name: "Nebutra Assistant",
    description: "General-purpose AI assistant for your SaaS",
    model: "openai/gpt-5.4",
    instructions:
      "You are a helpful AI assistant for this SaaS application. Help users with their questions about the platform, their data, and general inquiries. Always be professional and concise.",
    maxSteps: 10,
    memory: { shortTerm: { maxMessages: 50 }, longTerm: { enabled: true } },
  },
  {
    id: "analyst",
    name: "Data Analyst",
    description: "Analyzes data and generates insights from your dashboard",
    model: "anthropic/claude-sonnet-4.6",
    instructions:
      "You are a data analyst agent. Help users understand their metrics, generate reports, and find insights in their data. Use the database_query tool to fetch relevant data.",
    tools: ["database_query", "knowledge_base"],
    maxSteps: 15,
    memory: { shortTerm: { maxMessages: 30 }, longTerm: { enabled: true } },
  },
  {
    id: "support",
    name: "Support Agent",
    description: "Handles customer support inquiries using your knowledge base",
    model: "openai/gpt-5.4",
    instructions:
      "You are a customer support agent. Use the knowledge base to find answers to customer questions. If you cannot find an answer, suggest the user contact human support.",
    tools: ["knowledge_base", "web_search"],
    maxSteps: 8,
    memory: { shortTerm: { maxMessages: 20 }, longTerm: { enabled: false } },
  },
];
