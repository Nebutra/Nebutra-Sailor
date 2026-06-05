import type { SandboxResult, SandboxRunInput } from "./types";

/**
 * A WorkflowSandbox runs UNTRUSTED tenant scriptSource in isolation, exposing
 * only the injected HostBindings (agent/log/phase).
 *
 * SECURITY CONTRACT: an implementation MUST NOT execute scriptSource via `eval`,
 * `new Function`, or `node:vm` in our process — none of those are security
 * boundaries. The only sanctioned executor is an out-of-process / WASM-isolated
 * VM (see createQuickJSSandbox).
 */
export interface WorkflowSandbox {
  run(input: SandboxRunInput): Promise<SandboxResult>;
}

/**
 * Fail-closed default. If no real sandbox adapter is wired, REFUSE — never fall
 * back to executing untrusted JS in-process. A caller that wants to actually run
 * workflows must opt into a concrete sandbox (createQuickJSSandbox) explicitly.
 */
export const REFUSING_WORKFLOW_SANDBOX: WorkflowSandbox = {
  async run(): Promise<SandboxResult> {
    throw new Error(
      "No workflow sandbox configured. Untrusted tenant scriptSource must run inside an " +
        "isolated VM (createQuickJSSandbox) — refusing to execute in-process.",
    );
  },
};
