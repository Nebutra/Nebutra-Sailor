import { describe, expect, it, vi } from "vitest";
import {
  type DocumentVersionConflictError,
  ParaWorkspaceRepository,
} from "../para-workspace.repository";

function makePrisma(ws: Partial<Record<string, unknown>> = {}) {
  return {
    paraProject: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    paraWorkspace: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      ...ws,
    },
  } as unknown as import("@nebutra/db").PrismaClient;
}

describe("ParaWorkspaceRepository", () => {
  it("createWorkspace is zero-step: auto-named from the project count with an empty document", async () => {
    const prisma = makePrisma({
      count: vi.fn().mockResolvedValueOnce(2),
      create: vi.fn(async (a: { data: unknown }) => a.data),
    });
    const repo = new ParaWorkspaceRepository(prisma, "org_1");
    const ws = (await repo.createWorkspace("p1")) as unknown as {
      name: string;
      document: { nodes: object };
      tenantId: string;
    };
    expect(ws.name).toBe("Untitled 3");
    expect(ws.tenantId).toBe("org_1");
    expect(ws.document.nodes).toEqual({});
  });

  it("putDocument bumps the version when the expected version matches", async () => {
    const updated = { id: "w1", documentVersion: 4, document: { nodes: { a: 1 } } };
    const prisma = makePrisma({
      updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
      findFirst: vi.fn().mockResolvedValueOnce(updated),
    });
    const repo = new ParaWorkspaceRepository(prisma, "org_1");
    const res = await repo.putDocument("w1", 3, { nodes: { a: 1 } });
    expect(res.workspace.documentVersion).toBe(4);
    const call = (prisma.paraWorkspace.updateMany as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where).toMatchObject({ id: "w1", tenantId: "org_1", documentVersion: 3 });
    expect(call.data.documentVersion).toBe(4);
  });

  it("putDocument throws a conflict carrying the server copy when the version is stale", async () => {
    const current = { id: "w1", documentVersion: 5, document: { nodes: { server: true } } };
    const prisma = makePrisma({
      updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
      findFirst: vi.fn().mockResolvedValueOnce(current),
    });
    const repo = new ParaWorkspaceRepository(prisma, "org_1");
    await expect(repo.putDocument("w1", 3, {})).rejects.toMatchObject({
      name: "DocumentVersionConflictError",
      currentVersion: 5,
      current: { nodes: { server: true } },
    } satisfies Partial<DocumentVersionConflictError>);
  });
});
