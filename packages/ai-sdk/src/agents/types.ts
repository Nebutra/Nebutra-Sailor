export interface AgentConfig {
  /** Unique agent identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** System instructions */
  instructions: string;
  /** Model to use (AI Gateway format: "provider/model") */
  model: string;
  /** Available tools */
  tools?: Record<string, AgentTool>;
  /** Max steps before stopping */
  maxSteps?: number;
  /** Memory configuration */
  memory?: MemoryConfig;
}

export interface AgentTool {
  description: string;
  inputSchema: unknown;
  execute: (input: unknown, context: AgentContext) => Promise<unknown>;
}

export interface AgentContext {
  /** Current tenant */
  tenantId: string;
  /** Current user */
  userId: string;
  /** Request-scoped metadata */
  metadata?: Record<string, unknown>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface MemoryConfig {
  /** Memory provider */
  provider: "redis" | "postgres" | "in-memory";
  /** Max messages to retain in context */
  maxMessages?: number;
  /** TTL for conversation memory (seconds) */
  ttlSeconds?: number;
}

export interface AgentRun {
  id: string;
  agentId: string;
  tenantId: string;
  userId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  messages: AgentMessage[];
  tokenUsage: TokenUsage;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
    result?: string;
  }>;
  timestamp: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AgentResponse {
  readonly messages: readonly AgentMessage[];
  readonly usage: TokenUsage;
  readonly finishReason: string;
  readonly agentId: string;
}

export interface OrchestratorConfig {
  readonly agents: readonly AgentConfig[];
  readonly defaultAgentId?: string;
}

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

export interface AgentResponse {
  readonly messages: readonly AgentMessage[];
  readonly usage: TokenUsage;
  readonly finishReason: string;
  readonly agentId: string;
}

export interface OrchestratorConfig {
  readonly agents: readonly AgentConfig[];
  readonly defaultAgentId?: string;
}

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
