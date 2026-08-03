/**
 * Gateway Track-B wiring — resolve Carina from env and attach command_exec.
 *
 * Env (operator / self-deployed daemon):
 *   CARINA_JSONRPC_URL       HTTP JSON-RPC base (required to enable)
 *   CARINA_JSONRPC_TOKEN     product/gateway Bearer (never local owner unlock)
 *   CARINA_JSONRPC_PATH      optional path under base (e.g. /jsonrpc)
 *   CARINA_WORKSPACE_ROOT    absolute path on Carina host for session.create
 *   CARINA_CLIENT_ID         optional hello client_id
 *
 * Fail-closed: without CARINA_JSONRPC_URL, returns REFUSING_SANDBOX and an
 * empty tool registry (no command_exec surface).
 */

import {
  RuntimeToolRegistry,
  isCarinaSandbox,
  registerCommandExecTool,
  resolveCarinaSandboxFromEnv,
  type ExternalSandbox,
} from "@nebutra/agent-runtime";

export type GatewayCarinaBundle = {
  readonly sandbox: ExternalSandbox;
  readonly tools: RuntimeToolRegistry;
  /** True when CARINA_JSONRPC_URL is set (sandbox is Carina, not refuse stub). */
  readonly carinaEnabled: boolean;
};

/**
 * Build sandbox + tools for an agent-runtime turn.
 * Pure enough to unit-test with a synthetic env map.
 */
export function createGatewayCarinaBundle(
  env: NodeJS.ProcessEnv = process.env,
): GatewayCarinaBundle {
  const sandbox = resolveCarinaSandboxFromEnv(env);
  const tools = new RuntimeToolRegistry();
  const carinaEnabled = isCarinaSandbox(sandbox);

  if (carinaEnabled) {
    const workspaceRoot = env.CARINA_WORKSPACE_ROOT?.trim();
    registerCommandExecTool(tools, {
      sandbox,
      ...(workspaceRoot ? { workspaceRoot } : {}),
    });
  }

  return { sandbox, tools, carinaEnabled };
}

export function gatewaySandboxOrRefuse(
  env: NodeJS.ProcessEnv = process.env,
): ExternalSandbox {
  return resolveCarinaSandboxFromEnv(env);
}
