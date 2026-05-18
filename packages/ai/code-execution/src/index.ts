import { readFile, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { CapabilityError } from "@nebutra/errors";
import {
  type ExecRequest,
  type ExecResponse,
  type SandboxHealth,
  SandboxRuntime,
} from "@nebutra/sandbox-runtime";

export type ApprovalMode = "always" | "once_per_session" | "never";

export interface PolicyRule {
  readonly match: string | RegExp;
  readonly requireApproval: ApprovalMode;
  readonly reason: string;
}

export const DefaultPolicy: readonly PolicyRule[] = [
  { match: /^rm\s+-rf\b/, requireApproval: "always", reason: "destructive recursive removal" },
  {
    match: /\b(format|mkfs)\b/,
    requireApproval: "always",
    reason: "destructive filesystem operation",
  },
  {
    match: /\bDROP\s+(DATABASE|SCHEMA|TABLE)\b/i,
    requireApproval: "always",
    reason: "destructive database operation",
  },
  {
    match: /\b(npm|pnpm|yarn)\s+publish\b/,
    requireApproval: "always",
    reason: "package publishing",
  },
  { match: /^git\s+push\b/, requireApproval: "once_per_session", reason: "remote git mutation" },
];

export interface BaseAction {
  readonly tenantId?: string;
  readonly threadId?: string;
  readonly actionId?: string;
  readonly approved?: boolean;
}

export interface ShellAction extends BaseAction {
  readonly type: "shell";
  readonly cmd: string;
  readonly cwd: string;
  readonly timeoutS?: number;
}

export interface ReadAction extends BaseAction {
  readonly type: "read";
  readonly path: string;
  readonly lineRange?: readonly [number, number];
}

export interface EditAction extends BaseAction {
  readonly type: "edit";
  readonly path: string;
  readonly diff: string;
  readonly lineRange?: readonly [number, number];
}

export interface IPythonAction extends BaseAction {
  readonly type: "ipython";
  readonly code: string;
  readonly kernelId: string;
}

export interface GitAction extends BaseAction {
  readonly type: "git";
  readonly op: "status" | "log" | "push";
  readonly args?: readonly string[];
}

export type Action = ShellAction | ReadAction | EditAction | IPythonAction | GitAction;

export interface ShellOutputObservation {
  readonly type: "shell_output";
  readonly actionId: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly executedOn: string;
}

export interface FileContentObservation {
  readonly type: "file_content";
  readonly actionId: string;
  readonly path: string;
  readonly content: string;
  readonly lines: readonly [number, number];
}

export interface EditAppliedObservation {
  readonly type: "edit_applied";
  readonly actionId: string;
  readonly path: string;
  readonly diff: string;
  readonly conflicts: readonly string[];
}

export interface ErrorObservation {
  readonly type: "error";
  readonly actionId: string;
  readonly kind: string;
  readonly message: string;
  readonly suggestion: string;
}

export type Observation =
  | ShellOutputObservation
  | FileContentObservation
  | EditAppliedObservation
  | ErrorObservation;

export interface SandboxRuntimeLike {
  exec(request: ExecRequest): Promise<ExecResponse>;
  doctor(): Promise<readonly SandboxHealth[]>;
}

export interface EventLogLike {
  commit(event: {
    traceId: string;
    kind: "tool_call" | "content_write" | "sandbox_exec";
    affected: readonly string[];
    parent: string | null;
    snapshot?: Record<string, string>;
  }): Promise<string>;
}

export interface CodeExecutorOptions {
  readonly tenantId?: string;
  readonly workspaceRoot?: string;
  readonly debugRoot?: string;
  readonly sandboxRuntime?: SandboxRuntimeLike;
  readonly eventLog?: EventLogLike;
  readonly policy?: readonly PolicyRule[];
}

export async function readExecutionDebug(root = process.cwd(), limit = 20): Promise<unknown[]> {
  return readCapabilityDebug("code-execution", { root, limit });
}

function requireTenant(explicit: string | undefined, fallback: string | undefined): string {
  const tenantId = explicit ?? fallback;
  if (!tenantId) {
    throw new CapabilityError("code-execution", "Code execution requires tenant context", {
      suggestion: "Pass tenantId on the action or construct CodeExecutor with a tenantId default.",
      statusCode: 400,
    });
  }
  return tenantId;
}

function actionIdFrom(action: Action): string {
  return action.actionId ?? `${action.type}_${Date.now().toString(36)}`;
}

function matchesRule(command: string, rule: PolicyRule): boolean {
  return typeof rule.match === "string" ? command.startsWith(rule.match) : rule.match.test(command);
}

function safeWorkspacePath(root: string, path: string): string {
  const normalized = normalize(path);
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new CapabilityError("code-execution", "Unsafe workspace path rejected", {
      suggestion: "Use a path relative to the configured workspace root.",
      metadata: { path },
      statusCode: 400,
    });
  }
  return join(root, normalized);
}

export class CodeExecutor {
  readonly #tenantId: string | undefined;
  readonly #workspaceRoot: string;
  readonly #debugRoot: string;
  readonly #sandboxRuntime: SandboxRuntimeLike;
  readonly #eventLog: EventLogLike | undefined;
  readonly #policy: readonly PolicyRule[];

  constructor(options: CodeExecutorOptions = {}) {
    this.#tenantId = options.tenantId;
    this.#workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#sandboxRuntime = options.sandboxRuntime ?? SandboxRuntime.fromConfig();
    this.#eventLog = options.eventLog;
    this.#policy = options.policy ?? DefaultPolicy;
  }

  async run(action: Action): Promise<Observation> {
    const tenantId = requireTenant(action.tenantId, this.#tenantId);
    const actionId = actionIdFrom(action);
    const started = Date.now();
    let observation: Observation;

    try {
      observation = await this.#runWithTenant({ ...action, tenantId }, actionId, started);
    } catch (cause) {
      observation = errorObservation(actionId, cause);
    }

    await appendCapabilityDebug(
      "code-execution",
      { type: "action", tenantId, action, observation },
      { root: this.#debugRoot },
    );
    return observation;
  }

  async doctor(): Promise<{
    readonly capability: "code-execution";
    readonly sandbox: readonly SandboxHealth[];
    readonly policies: number;
  }> {
    const sandbox = await this.#sandboxRuntime.doctor();
    await appendCapabilityDebug(
      "code-execution",
      { type: "doctor", sandbox },
      { root: this.#debugRoot },
    );
    return { capability: "code-execution", sandbox, policies: this.#policy.length };
  }

  policy(): readonly PolicyRule[] {
    return this.#policy;
  }

  async #runWithTenant(
    action: Action & { readonly tenantId: string },
    actionId: string,
    started: number,
  ): Promise<Observation> {
    switch (action.type) {
      case "shell":
        return this.#runShell(action, actionId, started);
      case "read":
        return this.#readFile(action, actionId);
      case "edit":
        return this.#editFile(action, actionId);
      case "git":
        return this.#runGit(action, actionId, started);
      case "ipython":
        return {
          type: "error",
          actionId,
          kind: "AdapterUnavailable",
          message: "IPython kernel execution is not configured",
          suggestion: "Configure a notebook kernel sidecar and route it through sandbox-runtime.",
        };
    }
  }

  async #runShell(
    action: ShellAction & { readonly tenantId: string },
    actionId: string,
    started: number,
  ): Promise<Observation> {
    const approval = this.#approvalRequired(action.cmd);
    if (approval && !action.approved) {
      return {
        type: "error",
        actionId,
        kind: "ApprovalRequired",
        message: `Command requires approval: ${approval.reason}`,
        suggestion:
          "Ask the user for explicit approval, then retry the action with approved: true.",
      };
    }

    const result = await this.#sandboxRuntime.exec({
      cmd: action.cmd,
      tenantId: action.tenantId,
      ...(action.threadId ? { threadId: action.threadId } : {}),
      ...(action.timeoutS !== undefined ? { hints: { durationS: action.timeoutS } } : {}),
    });
    await this.#eventLog?.commit({
      traceId: action.threadId ?? actionId,
      kind: "sandbox_exec",
      affected: [],
      parent: null,
    });
    return {
      type: "shell_output",
      actionId,
      stdout: result.aggregatedOutput,
      stderr: "",
      exitCode: result.exitCode,
      durationMs: Date.now() - started,
      executedOn: result.executedOn,
    };
  }

  async #runGit(
    action: GitAction & { readonly tenantId: string },
    actionId: string,
    started: number,
  ): Promise<Observation> {
    const command = `git ${action.op}${action.args?.length ? ` ${action.args.join(" ")}` : ""}`;
    return this.#runShell(
      {
        type: "shell",
        cmd: command,
        cwd: this.#workspaceRoot,
        tenantId: action.tenantId,
        ...(action.threadId ? { threadId: action.threadId } : {}),
        ...(action.approved !== undefined ? { approved: action.approved } : {}),
      },
      actionId,
      started,
    );
  }

  async #readFile(
    action: ReadAction & { readonly tenantId: string },
    actionId: string,
  ): Promise<Observation> {
    try {
      const content = await readFile(safeWorkspacePath(this.#workspaceRoot, action.path), "utf8");
      const lines = content.split("\n");
      const start = action.lineRange?.[0] ?? 1;
      const end = action.lineRange?.[1] ?? lines.length;
      return {
        type: "file_content",
        actionId,
        path: action.path,
        content: lines.slice(start - 1, end).join("\n"),
        lines: [start, end],
      };
    } catch (cause) {
      return errorObservation(actionId, cause, {
        kind: "FileReadFailed",
        suggestion: "Check the path with a read/list action before asking the executor to edit it.",
      });
    }
  }

  async #editFile(
    action: EditAction & { readonly tenantId: string },
    actionId: string,
  ): Promise<Observation> {
    const full = safeWorkspacePath(this.#workspaceRoot, action.path);
    try {
      const before = await readFile(full, "utf8");
      const after = applyUnifiedDiff(before, action.diff);
      await writeFile(full, after, "utf8");
      await this.#eventLog?.commit({
        traceId: action.threadId ?? actionId,
        kind: "content_write",
        affected: [action.path],
        parent: null,
        snapshot: { [action.path]: after },
      });
      return {
        type: "edit_applied",
        actionId,
        path: action.path,
        diff: action.diff,
        conflicts: [],
      };
    } catch (cause) {
      return errorObservation(actionId, cause, {
        kind: "EditFailed",
        suggestion:
          "Refresh the file, regenerate a unified diff against the current contents, and retry without overwrite semantics.",
      });
    }
  }

  #approvalRequired(command: string): PolicyRule | null {
    return (
      this.#policy.find((rule) => rule.requireApproval !== "never" && matchesRule(command, rule)) ??
      null
    );
  }
}

function errorObservation(
  actionId: string,
  cause: unknown,
  override: { readonly kind?: string; readonly suggestion?: string } = {},
): ErrorObservation {
  const message = cause instanceof Error ? cause.message : String(cause);
  return {
    type: "error",
    actionId,
    kind:
      override.kind ?? (cause instanceof CapabilityError ? "CapabilityError" : "ExecutionError"),
    message,
    suggestion:
      override.suggestion ??
      (cause instanceof CapabilityError && cause.suggestion
        ? cause.suggestion
        : "Inspect the action, sandbox route, and tenant context, then retry with a narrower command."),
  };
}

export function applyUnifiedDiff(original: string, diff: string): string {
  const originalHadTrailingNewline = original.endsWith("\n");
  let lines = originalHadTrailingNewline ? original.slice(0, -1).split("\n") : original.split("\n");
  if (original === "") lines = [];

  const diffLines = diff.split("\n");
  let index = 0;
  while (index < diffLines.length) {
    const line = diffLines[index] ?? "";
    if (!line.startsWith("@@")) {
      index += 1;
      continue;
    }
    index += 1;
    const oldLines: string[] = [];
    const newLines: string[] = [];
    while (index < diffLines.length && !(diffLines[index] ?? "").startsWith("@@")) {
      const current = diffLines[index] ?? "";
      if (current.startsWith("\\ No newline")) {
        index += 1;
        continue;
      }
      if (current.startsWith("-")) oldLines.push(current.slice(1));
      else if (current.startsWith("+")) newLines.push(current.slice(1));
      else if (current.startsWith(" ")) {
        oldLines.push(current.slice(1));
        newLines.push(current.slice(1));
      }
      index += 1;
    }
    const position = findSubsequence(lines, oldLines);
    if (position < 0) {
      throw new CapabilityError("code-execution", "Diff hunk does not match current file", {
        suggestion:
          "Re-read the file and generate a fresh unified diff against the latest content.",
        metadata: { oldLines },
        statusCode: 409,
      });
    }
    lines.splice(position, oldLines.length, ...newLines);
  }

  return `${lines.join("\n")}${originalHadTrailingNewline ? "\n" : ""}`;
}

function findSubsequence(haystack: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0) return 0;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return start;
  }
  return -1;
}
