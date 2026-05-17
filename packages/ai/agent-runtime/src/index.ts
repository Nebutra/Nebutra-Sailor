/**
 * @nebutra/agent-runtime — multi-tenant agent-runtime grammar.
 *
 * A faithful re-expression of a terminal coding-agent's runtime *design*
 * (thread/turn/item model, approval + capability policy, uniform tool/MCP
 * abstraction, event-sourced rollout, external-sandbox delegation) into
 * Sailor's grammar: TypeScript, multi-tenant, no infra changes, no in-process
 * untrusted-code execution.
 *
 * Track A (this package): policy + protocol + model + rollout, all tenant-scoped.
 * Track B (decoupled, not this repo): an optional isolator/kernel sidecar that
 * implements {@link ExternalSandbox} over the ./protocol contract.
 */

export * from "./dispatcher.js";
export * from "./durable-turn.js";
export * from "./loop.js";
export * from "./mcp-bridge.js";
export * from "./model.js";
export * from "./policy.js";
export * from "./protocol.js";
export * from "./rollout.js";
export * from "./rollout-store-persistent.js";
export * from "./sandbox.js";
export * from "./tools.js";
