import type { NodeModelSpec } from "@nebutra/agent-runtime";

/** Runtime caps for a workflow run — also the cost guardrail. */
export interface SandboxLimits {
  /** Max concurrent `agent()` calls in flight (enforced host-side). */
  readonly maxConcurrency: number;
  /** Hard ceiling on total `agent()` calls across the whole run. */
  readonly maxAgentsPerRun: number;
  /** Per-`agent()` retry budget on transient (429/5xx) failures. */
  readonly maxRetries: number;
  /** Wall-clock cap for the entire script. */
  readonly timeoutMs: number;
  /** VM heap cap. */
  readonly memoryBytes?: number;
}

/** Mirrors the WorkflowDefinition Prisma defaults (spec-locked caps). */
export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  maxConcurrency: 16,
  maxAgentsPerRun: 1000,
  maxRetries: 2,
  timeoutMs: 60_000,
  memoryBytes: 64 * 1024 * 1024,
};

/** Options a guest `agent(prompt, opts)` call may pass. */
export interface AgentCallOpts {
  readonly label?: string;
  readonly phase?: string;
  /** Per-node model meta (id/preset · effort · modality · capabilities). */
  readonly model?: NodeModelSpec;
  /** JSON Schema; when set the agent must return a matching object (AJV-rechecked). */
  readonly schema?: Record<string, unknown>;
  readonly agentType?: string;
}

/**
 * The ONLY capabilities the host exposes to the untrusted guest script. The
 * guest never touches the model/provider directly — it calls these, and the
 * host enforces concurrency, total-count, retry, and timeout caps around them.
 */
export interface HostBindings {
  /** Run one agent call; resolves with its result (string, or schema object). */
  agent(prompt: string, opts?: AgentCallOpts): Promise<unknown>;
  /** Emit a progress line (surfaced as a workflow event). */
  log(message: string): void;
  /** Start a phase grouping (surfaced as a workflow event). */
  phase(title: string): void;
  /**
   * Run another workflow as a sub-step and resolve with its return value.
   * Optional: when unset (or when the host disallows nesting) the guest
   * `runWorkflow()` rejects. The host owns depth/recursion limits.
   */
  runWorkflow?(workflowId: string, args?: unknown): Promise<unknown>;
}

export interface SandboxRunInput {
  /** Untrusted tenant-authored orchestration JS (the WorkflowDefinition.scriptSource). */
  readonly scriptSource: string;
  /** Value exposed to the script as the `args` global. */
  readonly args: unknown;
  readonly limits: SandboxLimits;
  readonly host: HostBindings;
}

export interface SandboxResult {
  readonly ok: boolean;
  /** The script's return value, structured-cloned out of the VM (null on error). */
  readonly returnValue: unknown;
  readonly error?: string;
}
