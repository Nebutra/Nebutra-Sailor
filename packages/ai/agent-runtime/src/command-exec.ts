/**
 * Native command-exec tool that delegates to {@link ExternalSandbox}.
 * Product Track B: pair with {@link createCarinaSandbox} + ensureSession.
 */

import { z } from "zod";

import { type CapabilityPolicy, DEFAULT_CAPABILITY_POLICY } from "./policy";
import { type ExternalSandbox, isCarinaSandbox, type SandboxExecResult } from "./sandbox";
import { RuntimeToolRegistry } from "./tools";

export const COMMAND_EXEC_TOOL_NAME = "command_exec" as const;

const commandExecInputSchema = z.object({
  command: z.string().min(1),
});

export type CommandExecToolInput = z.infer<typeof commandExecInputSchema>;

export type CommandExecToolOutput = {
  readonly exitCode: number;
  readonly aggregatedOutput: string;
  readonly executedOn: string;
  readonly decisionId?: string;
};

export type RegisterCommandExecToolOptions = {
  readonly sandbox: ExternalSandbox;
  /**
   * Absolute workspace on the Carina host. Required when sandbox is Carina
   * (session.create). Gateway reads `CARINA_WORKSPACE_ROOT`.
   */
  readonly workspaceRoot?: string;
  readonly capabilityPolicy?: CapabilityPolicy;
  readonly profile?: string;
  readonly approvalMode?: string;
};

/**
 * Register `command_exec` on a tool registry. For Carina sandboxes, ensures a
 * session for the turn thread before `command.exec`.
 */
export function registerCommandExecTool(
  registry: RuntimeToolRegistry,
  options: RegisterCommandExecToolOptions,
): void {
  const {
    sandbox,
    workspaceRoot,
    capabilityPolicy = DEFAULT_CAPABILITY_POLICY,
    profile,
    approvalMode,
  } = options;

  registry.register(
    {
      name: COMMAND_EXEC_TOOL_NAME,
      description:
        "Run a shell command in the external sandbox (Carina Track B). " +
        "Never executes in the Sailor web process.",
      inputSchema: commandExecInputSchema,
    },
    async (input, ctx): Promise<CommandExecToolOutput> => {
      if (isCarinaSandbox(sandbox)) {
        const root = workspaceRoot?.trim();
        if (!root) {
          throw new Error(
            "command_exec: CARINA_WORKSPACE_ROOT / workspaceRoot required " +
              "to create a Carina session before command.exec",
          );
        }
        await sandbox.ensureSession({
          threadId: ctx.threadId,
          workspaceRoot: root,
          tenantId: ctx.tenantId,
          ...(profile ? { profile } : {}),
          ...(approvalMode ? { approvalMode } : {}),
        });
      }

      const result: SandboxExecResult = await sandbox.exec({
        tenantId: ctx.tenantId,
        threadId: ctx.threadId,
        command: input.command,
        capabilityPolicy,
      });

      return {
        exitCode: result.exitCode,
        aggregatedOutput: result.aggregatedOutput,
        executedOn: result.executedOn,
        ...(result.decisionId !== undefined ? { decisionId: result.decisionId } : {}),
      };
    },
  );
}

/**
 * Build a registry that includes `command_exec` delegated to the given sandbox.
 * Prefer this only when a real isolator is configured; with
 * {@link REFUSING_SANDBOX} the tool will throw NoExecutorConfiguredError on use.
 */
export function buildSandboxToolRegistry(
  sandbox: ExternalSandbox,
  options: Omit<RegisterCommandExecToolOptions, "sandbox"> = {},
): RuntimeToolRegistry {
  const registry = new RuntimeToolRegistry();
  registerCommandExecTool(registry, { sandbox, ...options });
  return registry;
}
