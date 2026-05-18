import { type ApprovalGate, type ModelInvoker, runTurn } from "./loop";
import type { ThreadEvent, ThreadItem, TurnConfig } from "./model";
import { isTurnTerminal } from "./model";
import type { ApprovalPolicy } from "./policy";
import { DEFAULT_APPROVAL_POLICY } from "./policy";
import type { RolloutLine, RolloutStore } from "./rollout";
import { replay } from "./rollout";
import { RuntimeToolRegistry } from "./tools";

type EventLogKind = "llm_call" | "tool_call" | "sub_agent_call" | "content_write";

export interface PulsarEventInput {
  readonly traceId: string;
  readonly kind: EventLogKind;
  readonly affected: readonly string[];
  readonly parent: string | null;
  readonly snapshot?: Record<string, string>;
}

export interface PulsarBranchRecord {
  readonly name: string;
  readonly from: string;
  readonly at: string;
}

export interface PulsarEventLogPort {
  commit(event: PulsarEventInput): Promise<string>;
  branchFrom(id: string, name: string): Promise<PulsarBranchRecord>;
}

export interface StartThreadOptions {
  readonly threadId?: string;
  readonly maxSteps?: number;
}

export interface PulsarDeps {
  readonly tenantId: string;
  readonly config: TurnConfig;
  readonly model: ModelInvoker;
  readonly tools: RuntimeToolRegistry;
  readonly store: RolloutStore;
  readonly approvalGate: ApprovalGate;
  readonly approvalPolicy: ApprovalPolicy;
  readonly eventLog?: PulsarEventLogPort;
}

function newId(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required. Suggestion: pass a non-empty ${label}.`);
  }
  return trimmed;
}

function recordedEvents(lines: readonly RolloutLine[]): ThreadEvent[] {
  return lines.flatMap((line) => (line.type === "event" ? [line.event] : []));
}

function mapItemToEvent(item: ThreadItem): PulsarEventInput["kind"] {
  switch (item.type) {
    case "agent_message":
    case "reasoning":
      return "llm_call";
    case "file_change":
      return "content_write";
    case "command_execution":
    case "mcp_tool_call":
      return "tool_call";
    case "error":
    case "todo_list":
    case "web_search":
      return "tool_call";
  }
}

function affectedPaths(item: ThreadItem): readonly string[] {
  return item.type === "file_change" ? item.changes.map((change) => change.path) : [];
}

export class PulsarThread {
  readonly id: string;
  readonly playId: string;
  readonly tenantId: string;
  readonly #deps: PulsarDeps;
  readonly #input: string;
  readonly #maxSteps: number | undefined;
  readonly #mode: "start" | "resume";
  #events: ThreadEvent[] | undefined;

  constructor(input: {
    readonly id: string;
    readonly playId: string;
    readonly tenantId: string;
    readonly deps: PulsarDeps;
    readonly mode: "start" | "resume";
    readonly userInput: string;
    readonly maxSteps?: number;
  }) {
    this.id = input.id;
    this.playId = input.playId;
    this.tenantId = input.tenantId;
    this.#deps = input.deps;
    this.#input = input.userInput;
    this.#mode = input.mode;
    this.#maxSteps = input.maxSteps;
  }

  async *subscribe(): AsyncGenerator<ThreadEvent> {
    if (this.#events) {
      for (const event of this.#events) yield event;
      return;
    }

    const events: ThreadEvent[] = [];
    const emit = async (event: ThreadEvent): Promise<ThreadEvent> => {
      events.push(event);
      if (event.type === "item.completed") {
        await this.#mirrorItem(event.item);
      }
      return event;
    };

    if (this.#mode === "resume") {
      const lines = await this.#deps.store.read(this.tenantId, this.id);
      const projection = replay(lines);
      const recorded = recordedEvents(lines);
      const last = recorded.at(-1);
      if (projection && last && isTurnTerminal(last)) {
        this.#events = recorded;
        for (const event of recorded) yield event;
        return;
      }
    }

    yield await emit({ type: "thread.started", threadId: this.id });
    await this.#deps.store.append({
      tenantId: this.tenantId,
      threadId: this.id,
      type: "event",
      event: { type: "thread.started", threadId: this.id },
      at: new Date().toISOString(),
    });

    const stream = runTurn(this.#input, {
      tenantId: this.tenantId,
      threadId: this.id,
      config: this.#deps.config,
      approvalPolicy: this.#deps.approvalPolicy,
      model: this.#deps.model,
      tools: this.#deps.tools,
      store: this.#deps.store,
      approvalGate: this.#deps.approvalGate,
      ruleEvaluator: () => "allow",
      ...(this.#maxSteps !== undefined ? { maxSteps: this.#maxSteps } : {}),
    });

    for await (const event of stream) {
      yield await emit(event);
    }
    this.#events = events;
  }

  async #mirrorItem(item: ThreadItem): Promise<void> {
    const eventLog = this.#deps.eventLog;
    if (!eventLog) return;
    const parent = Pulsar.itemCommitIds.get(`${this.id}::__last`) ?? null;
    const commitId = await eventLog.commit({
      traceId: this.id,
      kind: mapItemToEvent(item),
      affected: affectedPaths(item),
      parent,
    });
    Pulsar.itemCommitIds.set(`${this.id}:${item.id}`, commitId);
    Pulsar.itemCommitIds.set(`${this.id}::__last`, commitId);
  }
}

export class PulsarBuilder {
  #tenantId?: string;
  #config?: TurnConfig;
  #model?: ModelInvoker;
  #tools: RuntimeToolRegistry = new RuntimeToolRegistry();
  #store?: RolloutStore;
  #approvalGate?: ApprovalGate;
  #approvalPolicy: ApprovalPolicy = DEFAULT_APPROVAL_POLICY;
  #eventLog?: PulsarEventLogPort;

  withTenant(tenantId: string): this {
    this.#tenantId = requireNonEmpty(tenantId, "tenantId");
    return this;
  }

  withConfig(config: TurnConfig): this {
    this.#config = config;
    return this;
  }

  withModel(model: ModelInvoker): this {
    this.#model = model;
    return this;
  }

  withTools(tools: RuntimeToolRegistry): this {
    this.#tools = tools;
    return this;
  }

  withRolloutStore(store: RolloutStore): this {
    this.#store = store;
    return this;
  }

  withApprovalGate(approvalGate: ApprovalGate): this {
    this.#approvalGate = approvalGate;
    return this;
  }

  withApprovalPolicy(policy: ApprovalPolicy): this {
    this.#approvalPolicy = policy;
    return this;
  }

  withEventLog(eventLog: PulsarEventLogPort): this {
    this.#eventLog = eventLog;
    return this;
  }

  build(): Pulsar {
    if (!this.#tenantId) throw new Error("tenantId is required. Suggestion: call withTenant().");
    if (!this.#config) throw new Error("config is required. Suggestion: call withConfig().");
    if (!this.#model) throw new Error("model is required. Suggestion: call withModel().");
    if (!this.#store) {
      throw new Error("rollout store is required. Suggestion: call withRolloutStore().");
    }
    if (!this.#approvalGate) {
      throw new Error("approval gate is required. Suggestion: call withApprovalGate().");
    }
    const deps: PulsarDeps = {
      tenantId: this.#tenantId,
      config: this.#config,
      model: this.#model,
      tools: this.#tools,
      store: this.#store,
      approvalGate: this.#approvalGate,
      approvalPolicy: this.#approvalPolicy,
      ...(this.#eventLog !== undefined ? { eventLog: this.#eventLog } : {}),
    };
    return new Pulsar(deps);
  }
}

export class Pulsar {
  static readonly itemCommitIds = new Map<string, string>();
  readonly #deps: PulsarDeps;

  constructor(deps: PulsarDeps) {
    this.#deps = deps;
  }

  static builder(): PulsarBuilder {
    return new PulsarBuilder();
  }

  async startPlay(
    playId: string,
    input: string,
    options: StartThreadOptions = {},
  ): Promise<PulsarThread> {
    const threadId = options.threadId ?? newId("thread");
    await this.#deps.store.append({
      tenantId: this.#deps.tenantId,
      threadId,
      type: "session_meta",
      config: this.#deps.config,
      at: new Date().toISOString(),
    });
    return new PulsarThread({
      id: threadId,
      playId: requireNonEmpty(playId, "playId"),
      tenantId: this.#deps.tenantId,
      deps: this.#deps,
      mode: "start",
      userInput: input,
      ...(options.maxSteps !== undefined ? { maxSteps: options.maxSteps } : {}),
    });
  }

  async resume(threadId: string): Promise<PulsarThread> {
    return new PulsarThread({
      id: requireNonEmpty(threadId, "threadId"),
      playId: "resume",
      tenantId: this.#deps.tenantId,
      deps: this.#deps,
      mode: "resume",
      userInput: "",
    });
  }

  async branchFromItem(
    threadId: string,
    itemId: string,
    name: string,
  ): Promise<PulsarBranchRecord> {
    const eventLog = this.#deps.eventLog;
    if (!eventLog) {
      throw new Error("event-log is required. Suggestion: call withEventLog() before branching.");
    }
    const commitId = Pulsar.itemCommitIds.get(
      `${requireNonEmpty(threadId, "threadId")}:${requireNonEmpty(itemId, "itemId")}`,
    );
    if (!commitId) {
      throw new Error(
        "item has no event-log commit. Suggestion: subscribe to the thread before branching.",
      );
    }
    return eventLog.branchFrom(commitId, requireNonEmpty(name, "branch name"));
  }
}
