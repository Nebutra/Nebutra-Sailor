import {
  appendCapabilityDebug,
  capabilityDebugPath,
  readCapabilityDebug,
} from "@nebutra/capability-kit/debug";

export interface ToolDebugEntry {
  readonly at: string;
  readonly type: "tool_call" | "connect" | "inspect";
  readonly requestId?: string;
  readonly tenantId?: string;
  readonly serverId?: string;
  readonly toolName?: string;
  readonly ok: boolean;
  readonly durationMs?: number;
  readonly error?: string;
  readonly suggestion?: string;
}

export function toolDebugPath(): string {
  return capabilityDebugPath("tool-protocol");
}

export async function appendToolDebug(
  entry: Omit<ToolDebugEntry, "at"> & { at?: string },
): Promise<void> {
  await appendCapabilityDebug("tool-protocol", entry);
}

export async function readToolDebug(limit = 10): Promise<ToolDebugEntry[]> {
  return readCapabilityDebug("tool-protocol", { limit }) as Promise<ToolDebugEntry[]>;
}
