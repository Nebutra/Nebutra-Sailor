import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getTenantDbMock = vi.fn();
const saveStartupCanvasLayoutMock = vi.fn();
const dbMock = { atelierCanvas: {} };

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  getTenantDb: getTenantDbMock,
}));

vi.mock("@/lib/startup-os/store", () => ({
  saveStartupCanvasLayout: saveStartupCanvasLayoutMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/startup-os/projects/[projectId]/canvas/route");
}

function routeContext(projectId = "project_1") {
  return {
    params: Promise.resolve({ projectId }),
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/startup-os/projects/project_1/canvas", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/startup-os/projects/[projectId]/canvas", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset().mockResolvedValue({
      userId: "user_admin",
      orgId: "org_1",
      isSignedIn: true,
      sessionClaims: { org_role: "org:admin" },
    });
    getTenantDbMock.mockReset().mockReturnValue(dbMock);
    saveStartupCanvasLayoutMock.mockReset().mockResolvedValue({
      project: { id: "project_1" },
      events: [],
      canvasLayout: {
        zoom: 0.92,
        updatedAt: "2026-05-29T00:00:00.000Z",
        nodePositions: { "node:1": { x: 1, y: 2 } },
      },
    });
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STARTUP_AGENT_OS_PROTOTYPE", "1");
  });

  it("validates and persists canvas layout through the tenant store", async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      request({
        zoom: 0.92,
        updatedAt: "2026-05-29T00:00:00.000Z",
        nodePositions: { "node:1": { x: 1, y: 2 } },
      }),
      routeContext("project_1"),
    );
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(200);
    expect(saveStartupCanvasLayoutMock).toHaveBeenCalledWith(dbMock, "org_1", "project_1", {
      zoom: 0.92,
      updatedAt: "2026-05-29T00:00:00.000Z",
      nodePositions: { "node:1": { x: 1, y: 2 } },
    });
  });

  it("rejects malformed canvas positions instead of persisting junk", async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      request({
        zoom: 8,
        updatedAt: "not-a-date",
        nodePositions: { "node:1": { x: Number.NaN, y: 2 } },
      }),
      routeContext("project_1"),
    );
    if (!response) throw new Error("Expected route response.");

    expect(response.status).toBe(400);
    expect(saveStartupCanvasLayoutMock).not.toHaveBeenCalled();
  });
});
