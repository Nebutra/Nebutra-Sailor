/**
 * @nebutra/workflow-runtime — tenant-authored workflow orchestration.
 *
 * A workflow is tenant-authored JS (`agent()/parallel()/phase()`) that runs
 * ONLY inside a fail-closed sandbox. This package owns the sandbox seam, the
 * QuickJS adapter, and the guest-facing primitives; the actual model call
 * behind `agent()` is injected by the host (the gateway) via HostBindings, so
 * the runtime layers on @nebutra/agents + @nebutra/agent-runtime without
 * re-implementing the provider stack or wave scheduling.
 */

export * from "./quickjs-sandbox";
export * from "./sandbox";
export * from "./types";
