/**
 * Gateway Track-B wiring — resolve Carina from env and attach command_exec.
 *
 * Env (operator / self-deployed daemon):
 *   CARINA_CODEPLOY               1 (default) same-host; 0 = opt out
 *   CARINA_DAEMON_SOCK            unix NDJSON path (default /var/carina/run/daemon.sock)
 *   CARINA_JSONRPC_URL            optional HTTP JSON-RPC base (non-socket bridge)
 *   CARINA_JSONRPC_TOKEN          product/gateway Bearer (never local owner unlock)
 *   CARINA_JSONRPC_PATH           optional path under base (e.g. /jsonrpc)
 *   CARINA_WORKSPACE_ROOT         default absolute path on Carina host
 *   CARINA_WORKSPACE_TEMPLATE     e.g. /var/carina/ws/{tenantId}
 *   CARINA_WORKSPACE_MAP          JSON {"org_x":"/path"}
 *   CARINA_SESSION_APPROVAL_MODE  passed to session.create (e.g. always-approve)
 *   CARINA_AUTO_APPROVE           1|true → auto resolve requires_approval once
 *   CARINA_CLIENT_ID              optional hello client_id
 *
 * Co-deploy (default): unix socket /var/carina/run/daemon.sock + workspace
 * /var/carina/ws — same host as api-gateway. Opt out: CARINA_CODEPLOY=0.
 *
 * Fail-closed only when co-deploy is disabled and no URL/socket is set.
 */

import {
  type CarinaEnv,
  type CarinaSandbox,
  type ExternalSandbox,
  isCarinaSandbox,
  RuntimeToolRegistry,
  registerCommandExecTool,
  resolveCarinaSandboxFromEnv,
  resolveCarinaWorkspaceRootWithCodeploy,
} from "@nebutra/agent-runtime";

export type GatewayCarinaBundle = {
  readonly sandbox: ExternalSandbox;
  readonly tools: RuntimeToolRegistry;
  /** True when sandbox is Carina (socket co-deploy and/or HTTP URL), not refuse stub. */
  readonly carinaEnabled: boolean;
  readonly workspaceRoot?: string;
};

/**
 * Build sandbox + tools for an agent-runtime turn.
 * Workspace is resolved per tenant (map → template → root).
 */
export function createGatewayCarinaBundle(
  env: CarinaEnv = process.env,
  opts: { readonly tenantId?: string; readonly threadId?: string } = {},
): GatewayCarinaBundle {
  const sandbox = resolveCarinaSandboxFromEnv(env);
  const tools = new RuntimeToolRegistry();
  const carinaEnabled = isCarinaSandbox(sandbox);

  let workspaceRoot: string | undefined;
  if (carinaEnabled) {
    workspaceRoot = resolveCarinaWorkspaceRootWithCodeploy(
      opts.tenantId ?? "_default",
      env,
      opts.threadId ?? "",
    );
    const approvalMode = env.CARINA_SESSION_APPROVAL_MODE?.trim();
    registerCommandExecTool(tools, {
      sandbox,
      ...(workspaceRoot ? { workspaceRoot } : {}),
      ...(approvalMode ? { approvalMode } : {}),
    });
  }

  return {
    sandbox,
    tools,
    carinaEnabled,
    ...(workspaceRoot ? { workspaceRoot } : {}),
  };
}

export function gatewaySandboxOrRefuse(env: CarinaEnv = process.env): ExternalSandbox {
  return resolveCarinaSandboxFromEnv(env);
}

/** Narrow helper for routes that need Carina-only methods. */
export function getCarinaSandbox(env: CarinaEnv = process.env): CarinaSandbox | null {
  const sandbox = resolveCarinaSandboxFromEnv(env);
  return isCarinaSandbox(sandbox) ? sandbox : null;
}
