import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CapabilityError } from "@nebutra/errors";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export type EventKind =
  | "llm_call"
  | "tool_call"
  | "sub_agent_call"
  | "content_write"
  | "sandbox_exec";

export interface EventInput {
  readonly traceId: string;
  readonly kind: EventKind;
  readonly affected: readonly string[];
  readonly parent: string | null;
  readonly snapshot?: Record<string, string>;
}

export interface EventRecord extends EventInput {
  readonly id: string;
  readonly tenantId: string;
  readonly at: string;
  readonly summary: string;
  readonly objectHashes: readonly string[];
}

export interface BranchRecord {
  readonly name: string;
  readonly from: string;
  readonly at: string;
}

export interface RollbackPlan {
  readonly dryRun: true;
  readonly target: string;
  readonly affected: readonly string[];
  readonly suggestion: string;
}

export interface EventLogOptions {
  readonly tenantId?: string;
  readonly summarize?: (event: EventInput) => Promise<string>;
}

function hashContent(content: string): string {
  return bytesToHex(blake3(new TextEncoder().encode(content)));
}

async function appendJsonl(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`, { flag: "a" });
}

async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export class EventLog {
  readonly #root: string;
  readonly #tenantId: string;
  readonly #summarize: (event: EventInput) => Promise<string>;

  private constructor(
    root: string,
    tenantId: string,
    summarize: (event: EventInput) => Promise<string>,
  ) {
    this.#root = root;
    this.#tenantId = tenantId;
    this.#summarize = summarize;
  }

  static async open(root: string, options: EventLogOptions = {}): Promise<EventLog> {
    const log = new EventLog(
      root,
      options.tenantId ?? "local",
      options.summarize ??
        (async (event) => `${event.kind} touched ${event.affected.length} path(s)`),
    );
    await mkdir(log.objectsRoot(), { recursive: true });
    return log;
  }

  objectsRoot(): string {
    return join(this.#root, "objects", this.#tenantId);
  }

  eventsPath(): string {
    return join(this.#root, "events", `${this.#tenantId}.jsonl`);
  }

  branchesPath(): string {
    return join(this.#root, "branches", `${this.#tenantId}.jsonl`);
  }

  async commit(event: EventInput): Promise<string> {
    const objectHashes: string[] = [];
    for (const [path, content] of Object.entries(event.snapshot ?? {})) {
      const hash = hashContent(content);
      objectHashes.push(hash);
      await writeFile(join(this.objectsRoot(), hash), content, "utf8");
      await appendJsonl(join(this.objectsRoot(), "index.jsonl"), { hash, path });
    }
    const id = hashContent(
      JSON.stringify({ event, objectHashes, tenantId: this.#tenantId, at: Date.now() }),
    );
    const record: EventRecord = {
      ...event,
      id,
      tenantId: this.#tenantId,
      at: new Date().toISOString(),
      summary: await this.#summarize(event),
      objectHashes,
    };
    await appendJsonl(this.eventsPath(), record);
    await appendJsonl(join(process.cwd(), ".nebutra", "debug", "event-log.jsonl"), record);
    return id;
  }

  async timeline(): Promise<readonly EventRecord[]> {
    return readJsonl<EventRecord>(this.eventsPath());
  }

  async rollbackTo(id: string): Promise<RollbackPlan> {
    const target = (await this.timeline()).find((event) => event.id === id);
    if (!target) {
      throw new CapabilityError("event-log", "Rollback target not found", {
        suggestion: "Run `pnpm chronos:timeline` and choose an event id from the current tenant.",
        metadata: { id },
        statusCode: 404,
      });
    }
    return {
      dryRun: true,
      target: id,
      affected: target.affected,
      suggestion: "Review this plan, then call an explicit apply API in a higher layer.",
    };
  }

  async branchFrom(id: string, name: string): Promise<BranchRecord> {
    const exists = (await this.timeline()).some((event) => event.id === id);
    if (!exists) {
      throw new CapabilityError("event-log", "Branch source not found", {
        suggestion: "Run `pnpm chronos:timeline` and branch from an existing event id.",
        metadata: { id },
        statusCode: 404,
      });
    }
    const branch = { name, from: id, at: new Date().toISOString() };
    await appendJsonl(this.branchesPath(), branch);
    return branch;
  }
}
