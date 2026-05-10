/**
 * Core types for the multi-agent orchestration engine.
 *
 * All tenant-scoped operations require an AgentContext carrying `tenantId`.
 * Usage tracking is emitted on every execution for downstream billing.
 */

// ─── Agent Configuration ──────────────────────────────────────────────────────

export interface AgentConfig {
  /** Unique identifier for this agent */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** What this agent does (used by the router for intent matching) */
  readonly description: string;
  /** Model identifier, e.g. "openai/gpt-5.4" or "anthropic/claude-sonnet-4.6" */
  readonly model: string;
  /** System prompt / instructions */
  readonly instructions: string;
  /** Tools this agent can invoke */
  readonly tools?: readonly AgentTool[];
  /** Maximum tool-loop iterations (default 20) */
  readonly maxSteps?: number;
  /** Memory configuration */
  readonly memory?: MemoryConfig;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly execute: (input: unknown, context: AgentContext) => Promise<unknown>;
}

// ─── Execution Context ────────────────────────────────────────────────────────

export interface AgentContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly conversationId: string;
  readonly metadata?: Record<string, unknown>;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface AgentMessage {
  readonly role: "user" | "assistant" | "system" | "tool";
  readonly content: string;
  readonly toolCalls?: readonly ToolCallResult[];
  readonly timestamp: Date;
}

export interface ToolCallResult {
  readonly toolName: string;
  readonly args: unknown;
  readonly result: unknown;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface AgentResponse {
  readonly messages: readonly AgentMessage[];
  readonly usage: TokenUsage;
  readonly finishReason: string;
  readonly agentId: string;
}

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryConfig {
  readonly shortTerm?: { readonly maxMessages: number };
  readonly longTerm?: { readonly enabled: boolean };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  readonly agents: readonly AgentConfig[];
  readonly router?: RouterConfig;
  readonly defaultAgentId?: string;
}

export interface RouterConfig {
  readonly strategy: "keyword" | "llm" | "custom";
  readonly customRouter?: (message: string, context: AgentContext) => Promise<string>;
}

export interface PipelineStep {
  readonly agentId: string;
  readonly transformInput?: (prevOutput: string) => string;
}

// ─── Usage / Billing ──────────────────────────────────────────────────────────

export interface AgentUsageEvent {
  readonly tenantId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
  readonly timestamp: Date;
}
