import { describe, expect, it } from "vitest";
import { approveGovernanceReview, compileStartupProject } from "../compiler";
import {
  SENTINEL,
  type StartupConversationEvent,
  type StartupConversationStreamer,
  streamStartupConversation,
} from "../conversation";
import { buildStartupProjectFiles } from "../files";

function fixtureProject() {
  return approveGovernanceReview(
    compileStartupProject({
      thesis: "A Startup Agent OS that turns a founder thesis into a real launch surface.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    }),
    "2026-05-29T00:01:00.000Z",
  );
}

function clock(values: readonly string[]) {
  const queue = [...values];
  return () => queue.shift() ?? "2026-05-29T09:00:00.000Z";
}

interface FakeStreamerOptions {
  readonly planChunks?: readonly string[];
  readonly result: unknown;
  readonly fenced?: boolean;
  readonly omitSentinel?: boolean;
  readonly throwAfter?: number;
  readonly finish?: {
    readonly provider: string;
    readonly model: string;
    readonly usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  };
}

function fakeStreamer(options: FakeStreamerOptions): StartupConversationStreamer {
  const planChunks = options.planChunks ?? ["Plan: ", "build the launch surface."];
  const resultText =
    typeof options.result === "string" ? options.result : JSON.stringify(options.result);
  const tail = options.fenced === false ? resultText : `\`\`\`json\n${resultText}\n\`\`\``;
  const finish = options.finish ?? {
    provider: "openai",
    model: "fast",
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  };

  return async function* streamer() {
    let emitted = 0;
    for (const chunk of planChunks) {
      if (options.throwAfter !== undefined && emitted >= options.throwAfter) {
        throw new Error("streamer exploded");
      }
      yield chunk;
      emitted += 1;
    }
    if (!options.omitSentinel) {
      yield `\n${SENTINEL}\n`;
      yield tail;
    }
    return finish;
  };
}

async function drain(generator: AsyncGenerator<StartupConversationEvent, unknown, void>) {
  const events: StartupConversationEvent[] = [];
  let next = await generator.next();
  while (!next.done) {
    events.push(next.value);
    next = await generator.next();
  }
  return { events, result: next.value };
}

const VALID_RESULT = {
  summary: "Generated a launch landing page from CompanyContext.",
  artifactUpdates: [
    {
      kind: "landing_page",
      status: "ready",
      summary: "AI-generated landing page ready for review.",
      payload: ["Hero: turn startup chaos into company state."],
    },
  ],
  filePatches: [
    {
      path: "index.html",
      content:
        "<!doctype html><html><body><main><h1>Conversational launch surface</h1></main></body></html>",
    },
  ],
};

describe("Startup OS streaming conversation engine", () => {
  it("A1: streams plan deltas then parses the JSON tail in order", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Make the landing page sharper.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock([
        "2026-05-29T00:02:00.000Z",
        "2026-05-29T00:02:01.000Z",
        "2026-05-29T00:02:02.000Z",
      ]),
      streamModel: fakeStreamer({ result: VALID_RESULT }),
    });

    const { events, result } = await drain(generator);
    const types = events.map((event) => event.type);

    expect(types[0]).toBe("status");
    expect((events[0] as { phase: string }).phase).toBe("started");
    const statusPhases = events
      .filter(
        (event): event is Extract<StartupConversationEvent, { type: "status" }> =>
          event.type === "status",
      )
      .map((event) => event.phase);
    expect(statusPhases).toEqual(["started", "planning", "generating", "applying", "done"]);
    expect(types.filter((type) => type === "plan-delta").length).toBeGreaterThanOrEqual(1);
    expect(types).toContain("file");
    expect(types).toContain("artifact");
    expect(types).toContain("summary");
    expect(types).toContain("done");

    // ordering: planning before generating before applying before done
    const statusIndex = (phase: string) =>
      events.findIndex((event) => event.type === "status" && event.phase === phase);
    expect(statusIndex("planning")).toBeLessThan(statusIndex("generating"));
    expect(statusIndex("generating")).toBeLessThan(statusIndex("applying"));
    expect(statusIndex("applying")).toBeLessThan(statusIndex("done"));

    const resolved = result as {
      plan: string;
      summary: string;
      files?: readonly { path: string }[];
    };
    expect(resolved.plan).toContain("build the launch surface.");
    expect(resolved.summary).toBe(VALID_RESULT.summary);
  });

  it("A2: applies filePatches via patchStartupProjectFile and emits one file event", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Patch index.html.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      // now() call order: started, planning, generating, applying(appliedAt), done
      now: clock([
        "2026-05-29T00:02:00.000Z",
        "2026-05-29T00:02:01.000Z",
        "2026-05-29T00:02:02.000Z",
        "2026-05-29T00:02:05.000Z",
      ]),
      streamModel: fakeStreamer({ result: VALID_RESULT }),
    });

    const { events, result } = await drain(generator);
    const fileEvents = events.filter(
      (event): event is Extract<StartupConversationEvent, { type: "file" }> =>
        event.type === "file",
    );

    expect(fileEvents).toHaveLength(1);
    expect(fileEvents[0]).toMatchObject({ path: "index.html", action: "updated" });

    const resolved = result as { files?: typeof files };
    const patched = resolved.files?.find((file) => file.path === "index.html");
    expect(patched?.content).toContain("Conversational launch surface");
    expect(patched?.generatedFrom).toBe("user-edit");
    expect(patched?.updatedAt).toBe("2026-05-29T00:02:05.000Z");
  });

  it("A3: emits artifact events and folds artifact updates into the project", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Mark landing ready.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: VALID_RESULT }),
    });

    const { events, result } = await drain(generator);
    const artifactEvents = events.filter(
      (event): event is Extract<StartupConversationEvent, { type: "artifact" }> =>
        event.type === "artifact",
    );

    expect(artifactEvents).toHaveLength(1);
    expect(artifactEvents[0]).toMatchObject({ kind: "landing_page", status: "ready" });

    const resolved = result as { project: typeof project };
    expect(
      resolved.project.artifacts.find((artifact) => artifact.kind === "landing_page"),
    ).toMatchObject({
      status: "ready",
      summary: "AI-generated landing page ready for review.",
    });
  });

  it("A4: records usage when totalTokens>0 and skips when totalTokens is 0", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const recorded: Array<{ tenantId: string; tokens: number }> = [];
    const generatorWithUsage = streamStartupConversation(project, "Record usage.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: VALID_RESULT }),
      recordUsage: async (event) => {
        recorded.push({ tenantId: event.tenantId, tokens: event.tokens });
      },
    });
    await drain(generatorWithUsage);
    expect(recorded).toEqual([{ tenantId: "org_123", tokens: 150 }]);

    const recordedZero: unknown[] = [];
    const generatorZero = streamStartupConversation(project, "No usage.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({
        result: VALID_RESULT,
        finish: { provider: "openai", model: "fast", usage: { totalTokens: 0 } },
      }),
      recordUsage: async (event) => {
        recordedZero.push(event);
      },
    });
    await drain(generatorZero);
    expect(recordedZero).toEqual([]);
  });

  it("A5: fails closed on a malformed JSON tail without mutating files or project", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Break the JSON.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: "this is not json", fenced: false }),
    });

    const { events, result } = await drain(generator);
    const errorEvents = events.filter(
      (event): event is Extract<StartupConversationEvent, { type: "error" }> =>
        event.type === "error",
    );

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]?.message).toContain("strict JSON");
    expect(events.some((event) => event.type === "done")).toBe(false);

    const resolved = result as {
      events: readonly { type: string }[];
      files?: typeof files;
      project: typeof project;
    };
    expect(resolved.events.map((event) => event.type)).toEqual([
      "conversation_started",
      "conversation_failed",
    ]);
    expect(resolved.files).toEqual(files);
    expect(resolved.project).toEqual(project);
  });

  it("A6: fails closed when the sentinel never appears", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Forget the sentinel.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: VALID_RESULT, omitSentinel: true }),
    });

    const { events, result } = await drain(generator);

    expect(events.some((event) => event.type === "error")).toBe(true);
    expect(events.some((event) => event.type === "done")).toBe(false);
    const resolved = result as { events: readonly { type: string }[] };
    expect(resolved.events.map((event) => event.type)).toEqual([
      "conversation_started",
      "conversation_failed",
    ]);
  });

  it("A7: propagates a streamer throw as an error event with no done", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Explode mid-stream.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: VALID_RESULT, throwAfter: 1 }),
    });

    const { events, result } = await drain(generator);

    const errorEvents = events.filter((event) => event.type === "error");
    expect(errorEvents).toHaveLength(1);
    expect(events.some((event) => event.type === "done")).toBe(false);
    const resolved = result as { events: readonly { type: string }[] };
    expect(resolved.events.map((event) => event.type)).toEqual([
      "conversation_started",
      "conversation_failed",
    ]);
  });

  it("A8: builds appendable events with the actor on every event", async () => {
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);

    const generator = streamStartupConversation(project, "Build appendable events.", {
      tenantId: "org_123",
      userId: "user_123",
      files,
      now: clock(["2026-05-29T00:02:00.000Z"]),
      streamModel: fakeStreamer({ result: VALID_RESULT }),
    });

    const { result } = await drain(generator);
    const resolved = result as {
      events: readonly { type: string; actorId?: string }[];
    };

    expect(resolved.events.map((event) => event.type)).toEqual([
      "conversation_started",
      "conversation_message",
      "file_updated",
      "conversation_completed",
    ]);
    expect(resolved.events.every((event) => event.actorId === "user_123")).toBe(true);
  });
});
