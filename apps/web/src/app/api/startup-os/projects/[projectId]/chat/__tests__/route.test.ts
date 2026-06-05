import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileStartupProject } from "@/lib/startup-os/compiler";
import type { StartupConversationEvent } from "@/lib/startup-os/conversation";
import { buildStartupProjectFiles } from "@/lib/startup-os/files";
import type { StartupOSEventInput } from "@/lib/startup-os/store";

const getAuthMock = vi.fn();
const getTenantDbMock = vi.fn();
const auditLogMock = vi.fn();
const getStartupProjectRecordMock = vi.fn();
const saveStartupProjectRecordMock = vi.fn();
const streamStartupConversationMock = vi.fn();
const recordStartupOSRunRolloutMock = vi.fn();
const defineMeterMock = vi.fn();
const ingestMock = vi.fn();

const dbMock = { atelierCanvas: {} };

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  getTenantDb: getTenantDbMock,
}));

vi.mock("@/lib/startup-os/store", () => ({
  getStartupProjectRecord: getStartupProjectRecordMock,
  saveStartupProjectRecord: saveStartupProjectRecordMock,
}));

vi.mock("@/lib/startup-os/rollout", () => ({
  recordStartupOSRunRollout: recordStartupOSRunRolloutMock,
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: auditLogMock }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@nebutra/metering", () => ({
  AI_TOKENS: {
    id: "ai_tokens",
    name: "AI Tokens",
    type: "counter",
    unit: "tokens",
    aggregation: "sum",
  },
  getMetering: vi.fn(async () => ({
    defineMeter: defineMeterMock,
    ingest: ingestMock,
  })),
}));

vi.mock("@/lib/startup-os/execution", () => ({
  hasStartupOSAIProviderKey: () =>
    Boolean(
      process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    ),
}));

vi.mock("@/lib/startup-os/conversation", () => ({
  streamStartupConversation: streamStartupConversationMock,
}));

interface FakeGeneratorOptions {
  readonly events: readonly StartupConversationEvent[];
  readonly result: {
    readonly project: ReturnType<typeof compileStartupProject>;
    readonly files?: ReturnType<typeof buildStartupProjectFiles>;
    readonly plan: string;
    readonly summary: string;
    readonly events: readonly StartupOSEventInput[];
  };
}

function fakeConversationGenerator(options: FakeGeneratorOptions) {
  return async function* generator() {
    for (const event of options.events) {
      yield event;
    }
    return options.result;
  };
}

async function loadRoute() {
  return import("@/app/api/startup-os/projects/[projectId]/chat/route");
}

function buildRequest(instruction: unknown = "Make the landing page sharper.") {
  return new Request("http://localhost/api/startup-os/projects/project_1/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instruction }),
  });
}

function routeContext(projectId = "project_1") {
  return {
    params: Promise.resolve({ projectId }),
  };
}

async function readStream(response: Response): Promise<string> {
  const body = response.body;
  if (!body) throw new Error("Expected a streamed response body.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let next = await reader.read();
  while (!next.done) {
    text += decoder.decode(next.value, { stream: true });
    next = await reader.read();
  }
  text += decoder.decode();
  return text;
}

const ADMIN_AUTH = {
  userId: "user_admin",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:admin" },
};

function fixtureProject() {
  return compileStartupProject({
    id: "project_1",
    thesis: "A Startup Agent OS for founders who need real launch artifacts.",
    arena: "AI SaaS",
    now: "2026-05-29T00:00:00.000Z",
  });
}

function completedEvents(): readonly StartupConversationEvent[] {
  return [
    { type: "status", phase: "started", occurredAt: "2026-05-29T00:02:00.000Z" },
    { type: "status", phase: "planning", occurredAt: "2026-05-29T00:02:00.100Z" },
    { type: "plan-delta", text: "Sharpen the hero copy." },
    { type: "status", phase: "generating", occurredAt: "2026-05-29T00:02:00.200Z" },
    { type: "status", phase: "applying", occurredAt: "2026-05-29T00:02:00.300Z" },
    {
      type: "file",
      path: "src/routes/index.tsx",
      language: "tsx",
      action: "updated",
      occurredAt: "2026-05-29T00:02:00.300Z",
    },
    { type: "artifact", kind: "landing_page", status: "ready" },
    { type: "summary", text: "Refined the landing page." },
    {
      type: "done",
      summary: "Refined the landing page.",
      fileCount: 1,
      artifactCount: 1,
      provider: "openai",
      model: "fast",
      totalTokens: 321,
      occurredAt: "2026-05-29T00:02:00.400Z",
    },
    { type: "status", phase: "done", occurredAt: "2026-05-29T00:02:00.400Z" },
  ];
}

describe("POST /api/startup-os/projects/[projectId]/chat", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset().mockResolvedValue(ADMIN_AUTH);
    getTenantDbMock.mockReset().mockReturnValue(dbMock);
    auditLogMock.mockReset().mockResolvedValue(undefined);
    getStartupProjectRecordMock.mockReset();
    saveStartupProjectRecordMock.mockReset();
    streamStartupConversationMock.mockReset();
    recordStartupOSRunRolloutMock
      .mockReset()
      .mockResolvedValue({ threadId: "startup-os:project_1:conversation" });
    defineMeterMock.mockReset();
    ingestMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STARTUP_AGENT_OS_PROTOTYPE", "1");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("C10: refuses with 503 JSON and never opens the stream without a provider key", async () => {
    const { POST } = await loadRoute();

    const response = await POST(buildRequest(), routeContext());
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("OPENAI_API_KEY"),
    });
    expect(streamStartupConversationMock).not.toHaveBeenCalled();
    expect(getStartupProjectRecordMock).not.toHaveBeenCalled();
  });

  it("C11: rejects an empty instruction with 400 JSON before streaming", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const { POST } = await loadRoute();

    const response = await POST(buildRequest(""), routeContext());
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(streamStartupConversationMock).not.toHaveBeenCalled();
  });

  it("C12: returns 404 JSON when the project is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    getStartupProjectRecordMock.mockResolvedValue(null);
    const { POST } = await loadRoute();

    const response = await POST(buildRequest(), routeContext("missing"));
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("not found"),
    });
    expect(streamStartupConversationMock).not.toHaveBeenCalled();
  });

  it("C13: streams SSE frames and persists save + rollout + audit on done", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);
    const patchedFiles = files.map((file) =>
      file.path === "src/routes/index.tsx"
        ? { ...file, content: "// Sharper landing route\n" }
        : file,
    );
    const resultEvents: readonly StartupOSEventInput[] = [
      {
        type: "conversation_started",
        occurredAt: "2026-05-29T00:02:00.000Z",
        actorId: "user_admin",
        summary: "Started conversational build turn.",
      },
      {
        type: "conversation_completed",
        occurredAt: "2026-05-29T00:02:00.400Z",
        actorId: "user_admin",
        summary: "Refined the landing page.",
      },
    ];

    getStartupProjectRecordMock.mockResolvedValue({ project, events: [], files });
    streamStartupConversationMock.mockImplementation(
      (
        passedProject: unknown,
        instruction: string,
        input: {
          readonly tenantId: string;
          readonly userId: string;
          readonly files?: unknown;
          readonly recordUsage?: (event: {
            readonly tenantId: string;
            readonly projectId: string;
            readonly runId: string;
            readonly provider: string;
            readonly model: string;
            readonly tokens: number;
          }) => Promise<void>;
        },
      ) => {
        expect(passedProject).toBe(project);
        expect(instruction).toBe("Make the landing page sharper.");
        expect(input).toMatchObject({ tenantId: "org_1", userId: "user_admin" });
        expect(input.files).toBe(files);
        return (async function* withUsage() {
          // The real engine records usage internally on totalTokens > 0.
          await input.recordUsage?.({
            tenantId: "org_1",
            projectId: project.id,
            runId: "conversation",
            provider: "openai",
            model: "fast",
            tokens: 321,
          });
          return yield* fakeConversationGenerator({
            events: completedEvents(),
            result: {
              project,
              files: patchedFiles,
              plan: "Sharpen the hero copy.",
              summary: "Refined the landing page.",
              events: resultEvents,
            },
          })();
        })();
      },
    );
    saveStartupProjectRecordMock.mockResolvedValue({
      project,
      events: resultEvents,
      files: patchedFiles,
    });

    const { POST } = await loadRoute();
    const response = await POST(buildRequest(), routeContext(project.id));
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");
    expect(response.headers.get("x-accel-buffering")).toBe("no");

    const body = await readStream(response);
    expect(body).toContain("event: status");
    expect(body).toContain("event: plan-delta");
    expect(body).toContain("event: file");
    expect(body).toContain("event: artifact");
    expect(body).toContain("event: summary");
    expect(body).toContain("event: done");
    expect(body).toContain("event: end");
    expect(body).toContain("data: [DONE]");
    expect(body).not.toContain("event: error");

    expect(saveStartupProjectRecordMock).toHaveBeenCalledWith(dbMock, "org_1", project, {
      events: resultEvents,
      files: patchedFiles,
    });
    expect(recordStartupOSRunRolloutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        db: dbMock,
        tenantId: "org_1",
        project,
        events: resultEvents,
      }),
    );
    expect(defineMeterMock).toHaveBeenCalledWith(expect.objectContaining({ id: "ai_tokens" }));
    expect(ingestMock).toHaveBeenCalledWith(
      expect.objectContaining({ meterId: "ai_tokens", tenantId: "org_1", value: 321 }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "startup_os.chat.completed",
        outcome: "success",
        resource: expect.objectContaining({ type: "startup_os_project_chat" }),
      }),
    );
  });

  it("C14: emits an error frame and audits a failure when the turn fails (still 200 SSE)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const project = fixtureProject();
    const files = buildStartupProjectFiles(project);
    const failedEvents: readonly StartupOSEventInput[] = [
      {
        type: "conversation_started",
        occurredAt: "2026-05-29T00:02:00.000Z",
        actorId: "user_admin",
        summary: "Started conversational build turn.",
      },
      {
        type: "conversation_failed",
        occurredAt: "2026-05-29T00:02:00.400Z",
        actorId: "user_admin",
        summary: "Startup OS model response must be strict JSON.",
      },
    ];

    getStartupProjectRecordMock.mockResolvedValue({ project, events: [], files });
    streamStartupConversationMock.mockReturnValue(
      fakeConversationGenerator({
        events: [
          { type: "status", phase: "started", occurredAt: "2026-05-29T00:02:00.000Z" },
          { type: "status", phase: "planning", occurredAt: "2026-05-29T00:02:00.100Z" },
          {
            type: "error",
            message: "Startup OS model response must be strict JSON.",
            occurredAt: "2026-05-29T00:02:00.400Z",
          },
        ],
        result: {
          project,
          files,
          plan: "",
          summary: "",
          events: failedEvents,
        },
      })(),
    );
    saveStartupProjectRecordMock.mockResolvedValue({ project, events: failedEvents, files });

    const { POST } = await loadRoute();
    const response = await POST(buildRequest(), routeContext(project.id));
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const body = await readStream(response);
    expect(body).toContain("event: error");
    expect(body).toContain("event: end");
    expect(body).not.toContain("event: done");

    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "startup_os.chat.failed",
        outcome: "failure",
      }),
    );
    expect(ingestMock).not.toHaveBeenCalled();
  });

  it("C15: enforces auth gates (401 unsigned, 403 no org, 403 no permission)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    getAuthMock.mockResolvedValueOnce({ isSignedIn: false, userId: null });
    let route = await loadRoute();
    let response = await route.POST(buildRequest(), routeContext());
    expect(response?.status).toBe(401);
    expect(streamStartupConversationMock).not.toHaveBeenCalled();

    vi.resetModules();
    getAuthMock.mockResolvedValueOnce({ isSignedIn: true, userId: "user_admin", orgId: null });
    route = await loadRoute();
    response = await route.POST(buildRequest(), routeContext());
    expect(response?.status).toBe(403);

    vi.resetModules();
    getAuthMock.mockResolvedValueOnce({
      isSignedIn: true,
      userId: "user_member",
      orgId: "org_1",
      sessionClaims: { org_role: "org:viewer" },
    });
    route = await loadRoute();
    response = await route.POST(buildRequest(), routeContext());
    expect(response?.status).toBe(403);
    expect(streamStartupConversationMock).not.toHaveBeenCalled();
  });
});
