import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileStartupProject } from "@/lib/startup-os/compiler";
import { buildStartupProjectFiles } from "@/lib/startup-os/files";

interface ExecuteInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly files?: ReturnType<typeof buildStartupProjectFiles>;
  readonly recordUsage?: (event: {
    readonly tenantId: string;
    readonly projectId: string;
    readonly runId: string;
    readonly provider: string;
    readonly model: string;
    readonly tokens: number;
  }) => Promise<void>;
}

const getAuthMock = vi.fn();
const getTenantDbMock = vi.fn();
const auditLogMock = vi.fn();
const getStartupProjectRecordMock = vi.fn();
const saveStartupProjectRecordMock = vi.fn();
const executeStartupRunMock = vi.fn();
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
  executeStartupRun: executeStartupRunMock,
  hasStartupOSAIProviderKey: () =>
    Boolean(
      process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    ),
}));

async function loadRoute() {
  return import("@/app/api/startup-os/projects/[projectId]/runs/[runId]/execute/route");
}

function buildRequest() {
  return new Request("http://localhost/api/startup-os/projects/project_1/runs/run_1/execute", {
    method: "POST",
  });
}

function routeContext(projectId = "project_1", runId = "run_1") {
  return {
    params: Promise.resolve({ projectId, runId }),
  };
}

const ADMIN_AUTH = {
  userId: "user_admin",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:admin" },
};

describe("POST /api/startup-os/projects/[projectId]/runs/[runId]/execute", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset().mockResolvedValue(ADMIN_AUTH);
    getTenantDbMock.mockReset().mockReturnValue(dbMock);
    auditLogMock.mockReset();
    getStartupProjectRecordMock.mockReset();
    saveStartupProjectRecordMock.mockReset();
    executeStartupRunMock.mockReset();
    recordStartupOSRunRolloutMock
      .mockReset()
      .mockResolvedValue({ threadId: "startup-os:project_1:run_1" });
    defineMeterMock.mockReset();
    ingestMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STARTUP_AGENT_OS_PROTOTYPE", "1");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("refuses to execute without a private server-side AI provider key", async () => {
    const { POST } = await loadRoute();

    const response = await POST(buildRequest(), routeContext());
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("OPENAI_API_KEY"),
    });
    expect(executeStartupRunMock).not.toHaveBeenCalled();
    expect(saveStartupProjectRecordMock).not.toHaveBeenCalled();
  });

  it("executes a persisted project, records metering, and appends execution events", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const project = compileStartupProject({
      id: "project_1",
      thesis: "A Startup Agent OS for founders who need real launch artifacts.",
      arena: "AI SaaS",
      now: "2026-05-29T00:00:00.000Z",
    });
    const files = buildStartupProjectFiles(project);
    const patchedFiles = files.map((file) =>
      file.path === "src/routes/index.tsx"
        ? {
            ...file,
            content: "// Real launch surface route\n",
            generatedFrom: "user-edit" as const,
            updatedAt: "2026-05-29T00:02:00.000Z",
          }
        : file,
    );
    const events = [
      {
        type: "run_started" as const,
        occurredAt: "2026-05-29T00:01:00.000Z",
        actorId: "user_admin",
        summary: "Started landing.draft.",
      },
      {
        type: "run_completed" as const,
        occurredAt: "2026-05-29T00:02:00.000Z",
        actorId: "user_admin",
        summary: "Completed landing.draft.",
      },
    ];
    getStartupProjectRecordMock.mockResolvedValue({ project, events: [], files });
    executeStartupRunMock.mockImplementation(
      async (_project: unknown, runId: string, input: ExecuteInput) => {
        expect(input.files).toBe(files);
        await input.recordUsage?.({
          tenantId: "org_1",
          projectId: project.id,
          runId,
          provider: "openai",
          model: "fast",
          tokens: 321,
        });
        return { project, events, files: patchedFiles };
      },
    );
    saveStartupProjectRecordMock.mockResolvedValue({ project, events, files: patchedFiles });

    const { POST } = await loadRoute();
    const response = await POST(buildRequest(), routeContext(project.id, "run_1"));
    if (!response) throw new Error("Expected route response.");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.execution).toEqual({
      status: "completed",
      rolloutThreadId: "startup-os:project_1:run_1",
    });
    expect(executeStartupRunMock).toHaveBeenCalledWith(
      project,
      "run_1",
      expect.objectContaining({
        tenantId: "org_1",
        userId: "user_admin",
      }),
    );
    expect(saveStartupProjectRecordMock).toHaveBeenCalledWith(dbMock, "org_1", project, {
      events,
      files: patchedFiles,
    });
    expect(recordStartupOSRunRolloutMock).toHaveBeenCalledWith({
      db: dbMock,
      tenantId: "org_1",
      project,
      runId: "run_1",
      events,
    });
    expect(defineMeterMock).toHaveBeenCalledWith(expect.objectContaining({ id: "ai_tokens" }));
    expect(ingestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meterId: "ai_tokens",
        tenantId: "org_1",
        value: 321,
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "startup_os.run.executed",
        outcome: "success",
      }),
    );
  });
});
