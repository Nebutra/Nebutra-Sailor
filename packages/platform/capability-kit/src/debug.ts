import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface CapabilityDebugOptions {
  readonly root?: string;
  readonly limit?: number;
}

export type CapabilityDebugEntry = Record<string, unknown> & {
  readonly at?: string;
};

function normalizeCapabilityName(capability: string): string {
  const normalized = capability
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new Error("Capability name is required for debug storage.");
  }
  return normalized;
}

export function capabilityDebugPath(capability: string, root = process.cwd()): string {
  return join(root, ".nebutra", "debug", `${normalizeCapabilityName(capability)}.jsonl`);
}

export async function appendCapabilityDebug(
  capability: string,
  entry: CapabilityDebugEntry,
  options: Pick<CapabilityDebugOptions, "root"> = {},
): Promise<void> {
  const path = capabilityDebugPath(capability, options.root ?? process.cwd());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readCapabilityDebug(
  capability: string,
  options: CapabilityDebugOptions = {},
): Promise<unknown[]> {
  try {
    const raw = await readFile(
      capabilityDebugPath(capability, options.root ?? process.cwd()),
      "utf8",
    );
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-(options.limit ?? 10))
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}
