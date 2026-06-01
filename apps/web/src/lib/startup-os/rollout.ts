import {
  PersistentRolloutStore,
  type ThreadEvent,
  type TurnConfig,
  type TurnUsage,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters";
import type { StartupOSProject } from "./compiler";
import type { StartupOSEventInput } from "./store";

export interface StartupOSRolloutDb {
  readonly agentRolloutLine: PrismaRolloutDelegate;
}

export interface RecordStartupOSRunRolloutInput {
  readonly db: StartupOSRolloutDb;
  readonly tenantId: string;
  readonly project: StartupOSProject;
  readonly runId: string;
  readonly events: readonly StartupOSEventInput[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rolloutThreadId(projectId: string, runId: string) {
  return `startup-os:${projectId}:${runId}`;
}

function configForRun(project: StartupOSProject, runId: string): TurnConfig {
  const run = project.runs.find((item) => item.id === runId);
  return {
    model: "fast",
    provider: run?.provider ?? "startup-os-executor",
    approvalPolicy: "startup-os.private-review",
    capabilityPolicy: "dashboard.no-external-mutation",
    reasoningEffort: "medium",
  };
}

function totalTokensFrom(events: readonly StartupOSEventInput[]) {
  return events.reduce((sum, event) => {
    const metadata = event.metadata;
    if (!isRecord(metadata) || typeof metadata.totalTokens !== "number") return sum;
    return sum + metadata.totalTokens;
  }, 0);
}

function usageFrom(events: readonly StartupOSEventInput[]): TurnUsage {
  return {
    inputTokens: totalTokensFrom(events),
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };
}

function eventItemId(event: StartupOSEventInput, index: number) {
  if (event.id) return event.id;
  return `startup_os_event_${index + 1}`;
}

function toThreadEvent(event: StartupOSEventInput, index: number): ThreadEvent {
  return {
    type: "item.completed",
    item: {
      id: eventItemId(event, index),
      type: "agent_message",
      text: `${event.type}: ${event.summary}`,
    },
  };
}

function terminalEvent(events: readonly StartupOSEventInput[]): ThreadEvent {
  const failed = events.find((event) => event.type === "run_failed");
  if (failed) {
    return {
      type: "turn.failed",
      error: { message: failed.summary },
    };
  }
  return {
    type: "turn.completed",
    usage: usageFrom(events),
  };
}

function eventTime(event: StartupOSEventInput | undefined) {
  return event?.occurredAt ?? new Date().toISOString();
}

export async function recordStartupOSRunRollout(input: RecordStartupOSRunRolloutInput) {
  const threadId = rolloutThreadId(input.project.id, input.runId);
  const config = configForRun(input.project, input.runId);
  const store = new PersistentRolloutStore(
    createPrismaRolloutPersistence(input.db.agentRolloutLine),
  );
  const firstEvent = input.events[0];
  const lastEvent = input.events.at(-1);

  await store.append({
    tenantId: input.tenantId,
    threadId,
    type: "session_meta",
    config,
    at: eventTime(firstEvent),
  });
  await store.append({
    tenantId: input.tenantId,
    threadId,
    type: "turn_context",
    config,
    at: eventTime(firstEvent),
  });
  await store.append({
    tenantId: input.tenantId,
    threadId,
    type: "event",
    event: { type: "turn.started" },
    at: eventTime(firstEvent),
  });

  for (const [index, event] of input.events.entries()) {
    await store.append({
      tenantId: input.tenantId,
      threadId,
      type: "event",
      event: toThreadEvent(event, index),
      at: eventTime(event),
    });
  }

  await store.append({
    tenantId: input.tenantId,
    threadId,
    type: "event",
    event: terminalEvent(input.events),
    at: eventTime(lastEvent),
  });

  return { threadId };
}
