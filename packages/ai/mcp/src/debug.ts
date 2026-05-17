import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
  return join(process.cwd(), ".nebutra", "debug", "tool-protocol.jsonl");
}

export async function appendToolDebug(
  entry: Omit<ToolDebugEntry, "at"> & { at?: string },
): Promise<void> {
  const path = toolDebugPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readToolDebug(limit = 10): Promise<ToolDebugEntry[]> {
  try {
    const raw = await readFile(toolDebugPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as ToolDebugEntry);
  } catch {
    return [];
  }
}
