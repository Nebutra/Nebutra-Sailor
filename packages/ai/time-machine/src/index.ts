import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog, type EventRecord, type RollbackPlan } from "@nebutra/event-log";
import { assetId } from "@nebutra/generation-context";

export type TimelineNodeKind = "milestone" | "decision" | "branch" | "play_completed";

export interface TimelineNode {
  readonly id: string;
  readonly eventId: string;
  readonly kind: TimelineNodeKind;
  readonly timestamp: string;
  readonly oneLineSummary: string;
  readonly branchId: string;
  readonly parentNode?: string;
  readonly affectedAssets: readonly string[];
  readonly preview: {
    readonly kind: "event-summary";
    readonly text: string;
  };
}

export interface TimelineView {
  readonly tenantId: string;
  readonly truthSource: "event-log";
  readonly nodes: readonly TimelineNode[];
}

export interface TimelineBranch {
  readonly branchId: string;
  readonly name: string;
  readonly fromEventId: string;
  readonly createdAt: string;
}

export interface TimelineAnnotation {
  readonly eventId: string;
  readonly starred: true;
  readonly label: string;
  readonly path: string;
}

export interface TimelineComparison {
  readonly leftEventId: string;
  readonly rightEventId: string;
  readonly changedAssets: readonly string[];
  readonly narrative: string;
}

export interface TimeMachineDoctorReport {
  readonly capability: "time-machine";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly truthSource: "event-log";
  readonly features: readonly string[];
  readonly suggestion?: string;
}

export interface TimeMachineOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

function requireTenant(value: string | undefined): string {
  if (!value?.trim()) {
    throw new CapabilityError("time-machine", "Time Machine requires tenant context", {
      suggestion: "Pass tenantId when opening TimeMachine so timeline reads stay tenant-scoped.",
      statusCode: 400,
    });
  }
  return value;
}

function nodeKind(event: EventRecord): TimelineNodeKind {
  if (event.traceId.includes("branch")) return "branch";
  if (event.traceId.includes("decision")) return "decision";
  if (event.traceId.includes("play")) return "play_completed";
  return "milestone";
}

function toNode(event: EventRecord): TimelineNode {
  return {
    id: `node_${event.id}`,
    eventId: event.id,
    kind: nodeKind(event),
    timestamp: event.at,
    oneLineSummary: event.summary,
    branchId: "main",
    ...(event.parent ? { parentNode: `node_${event.parent}` } : {}),
    affectedAssets: event.affected,
    preview: { kind: "event-summary", text: event.summary },
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export class TimeMachine {
  readonly #tenantId: string;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;

  private constructor(
    options: Required<Pick<TimeMachineOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<TimeMachineOptions, "debugRoot">,
  ) {
    this.#tenantId = requireTenant(options.tenantId);
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/time-machine",
    options: Omit<TimeMachineOptions, "root" | "contentStore" | "eventLog"> = {},
  ): Promise<TimeMachine> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new TimeMachine({ ...options, tenantId, contentStore, eventLog });
  }

  static async fromStores(
    options: Required<Pick<TimeMachineOptions, "tenantId" | "contentStore" | "eventLog">> &
      Pick<TimeMachineOptions, "root" | "debugRoot">,
  ): Promise<TimeMachine> {
    if (options.root) await mkdir(options.root, { recursive: true });
    return new TimeMachine({
      tenantId: options.tenantId,
      contentStore: options.contentStore,
      eventLog: options.eventLog,
      ...((options.debugRoot ?? options.root) !== undefined
        ? { debugRoot: options.debugRoot ?? options.root }
        : {}),
    });
  }

  async timelineView(): Promise<TimelineView> {
    const events = await this.#eventLog.timeline();
    const nodes = events.map(toNode);
    await this.#debug({ type: "timeline_view", tenantId: this.#tenantId, nodes: nodes.length });
    return { tenantId: this.#tenantId, truthSource: "event-log", nodes };
  }

  async branchFrom(eventId: string, name: string): Promise<TimelineBranch> {
    const branch = await this.#eventLog.branchFrom(eventId, name);
    const result = {
      branchId: assetId("branch", `${eventId}_${name}`),
      name: branch.name,
      fromEventId: branch.from,
      createdAt: branch.at,
    };
    await this.#debug({ type: "branch", tenantId: this.#tenantId, eventId, name });
    return result;
  }

  async star(eventId: string, label = "starred"): Promise<TimelineAnnotation> {
    await this.#requireEvent(eventId);
    const annotation = {
      eventId,
      starred: true,
      label,
      createdAt: new Date().toISOString(),
      truthSource: "event-log",
    };
    const path = `time-machine/annotations/${eventId}.json`;
    await this.#contentStore.write(path, `${JSON.stringify(annotation, null, 2)}\n`);
    await this.#eventLog.commit({
      traceId: assetId("time_machine_annotation", eventId),
      kind: "content_write",
      affected: [path],
      parent: eventId,
      snapshot: { [path]: `${JSON.stringify(annotation, null, 2)}\n` },
    });
    await this.#debug({ type: "star", tenantId: this.#tenantId, eventId, label });
    return { eventId, starred: true, label, path };
  }

  async compare(leftEventId: string, rightEventId: string): Promise<TimelineComparison> {
    const left = await this.#requireEvent(leftEventId);
    const right = await this.#requireEvent(rightEventId);
    const changedAssets = unique([...left.affected, ...right.affected]);
    const narrative = `Compared ${leftEventId} to ${rightEventId}: ${changedAssets.join(
      ", ",
    )} changed.`;
    await this.#debug({
      type: "compare",
      tenantId: this.#tenantId,
      leftEventId,
      rightEventId,
      changedAssets,
    });
    return { leftEventId, rightEventId, changedAssets, narrative };
  }

  async rollbackDryRun(eventId: string): Promise<RollbackPlan> {
    const plan = await this.#eventLog.rollbackTo(eventId);
    await this.#debug({
      type: "rollback_dry_run",
      tenantId: this.#tenantId,
      eventId,
      affected: plan.affected,
    });
    return plan;
  }

  async doctor(): Promise<TimeMachineDoctorReport> {
    const events = await this.#eventLog.timeline();
    const report: TimeMachineDoctorReport = {
      capability: "time-machine",
      ok: true,
      checkedAt: new Date().toISOString(),
      truthSource: "event-log",
      features: ["timeline", "branch", "compare", "rollback-dry-run", "annotation"],
      ...(events.length === 0
        ? { suggestion: "Commit at least one event to Chronos before opening the star-map view." }
        : {}),
    };
    await this.#debug({ type: "doctor", tenantId: this.#tenantId, events: events.length });
    return report;
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #requireEvent(eventId: string): Promise<EventRecord> {
    const event = (await this.#eventLog.timeline()).find((record) => record.id === eventId);
    if (!event) {
      throw new CapabilityError("time-machine", "Timeline event not found", {
        suggestion: "Call timelineView and choose an event id from the current tenant.",
        metadata: { eventId },
        statusCode: 404,
      });
    }
    return event;
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await appendCapabilityDebug("time-machine", entry, { root: this.#debugRoot });
  }
}

export async function readTimeMachineDebug(root = process.cwd(), limit = 20): Promise<unknown[]> {
  return readCapabilityDebug("time-machine", { root, limit });
}
