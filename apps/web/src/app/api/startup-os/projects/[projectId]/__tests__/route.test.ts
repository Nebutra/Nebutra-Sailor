import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileStartupProject } from "@/lib/startup-os/compiler";

const getAuthMock = vi.fn();
const getTenantDbMock = vi.fn();
const getStartupProjectRecordMock = vi.fn();
const saveStartupProjectFilesMock = vi.fn();
const dbMock = { atelierCanvas: {} };

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  getTenantDb: getTenantDbMock,
}));

vi.mock("@/lib/startup-os/store", () => ({
  getStartupProjectRecord: getStartupProjectRecordMock,
  saveStartupProjectFiles: saveStartupProjectFilesMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/startup-os/projects/[projectId]/route");
}

function routeContext(projectId = "project_1") {
  return {
    params: Promise.resolve({ projectId }),
  };
}

function request() {
  return new Request("http://localhost/api/startup-os/projects/project_1", {
    method: "GET",
  });
}

describe("/api/startup-os/projects/[projectId]", () => {
  const project = compileStartupProject({
    id: "project_1",
    thesis: "A launch OS that persists files through tenant storage.",
    arena: "AI SaaS",
    now: "2026-05-29T00:00:00.000Z",
  });

  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset().mockResolvedValue({
      userId: "user_admin",
      orgId: "org_1",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    getTenantDbMock.mockReset().mockReturnValue(dbMock);
    getStartupProjectRecordMock.mockReset().mockResolvedValue({
      project,
      events: [],
      files: undefined,
    });
    saveStartupProjectFilesMock
      .mockReset()
      .mockImplementation(async (_db, _orgId, _projectId, files) => ({
        project,
        events: [],
        files,
      }));
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STARTUP_AGENT_OS_PROTOTYPE", "1");
  });

  it("backfills missing project files before returning project detail", async () => {
    const { GET } = await loadRoute();

    const response = await GET(request(), routeContext("project_1"));
    if (!response) throw new Error("Expected route response.");
    const payload = (await response.json()) as {
      files: Array<{ path: string }>;
      previewHtml: string;
    };

    expect(response.status).toBe(200);
    expect(saveStartupProjectFilesMock).toHaveBeenCalledWith(
      dbMock,
      "org_1",
      "project_1",
      expect.arrayContaining([expect.objectContaining({ path: "src/routes/index.tsx" })]),
      expect.objectContaining({ type: "file_updated" }),
    );
    expect(payload.files.map((file) => file.path)).toContain("src/routes/index.tsx");
  });
});
