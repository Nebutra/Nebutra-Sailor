import { describe, expect, it, vi } from "vitest";
import { ApprovalAlreadyDecidedError, ParaAgentRepository } from "../para-agent.repository";

function makePrisma(over: Record<string, Record<string, unknown>> = {}) {
  const table = (extra: Record<string, unknown> = {}) => ({
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    ...extra,
  });
  return {
    paraThread: table(over.paraThread),
    paraRun: table(over.paraRun),
    paraApproval: table(over.paraApproval),
  } as unknown as import("@nebutra/db").PrismaClient;
}

const repo = (prisma: import("@nebutra/db").PrismaClient) =>
  new ParaAgentRepository(prisma, "org_1");

describe("ParaAgentRepository", () => {
  it("createThread trims and caps the auto-title", async () => {
    const prisma = makePrisma({
      paraThread: { create: vi.fn(async (a: { data: unknown }) => a.data) },
    });
    const thread = (await repo(prisma).createThread("p1", "  make it\n  colder  ")) as unknown as {
      title: string;
      tenantId: string;
    };
    expect(thread.title).toBe("make it colder");
    expect(thread.tenantId).toBe("org_1");
  });

  it("createThread falls back to a name when the prompt is blank", async () => {
    const prisma = makePrisma({
      paraThread: { create: vi.fn(async (a: { data: unknown }) => a.data) },
    });
    const thread = (await repo(prisma).createThread("p1", "   ")) as unknown as { title: string };
    expect(thread.title).toBe("New thread");
  });

  it("startRun only claims a QUEUED run, so a redelivered event cannot run it twice", async () => {
    const prisma = makePrisma({
      paraRun: {
        updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
        findFirst: vi.fn(),
      },
    });
    expect(await repo(prisma).startRun("r1")).toBeNull();
    const where = (
      prisma.paraRun.updateMany as unknown as { mock: { calls: [{ where: unknown }][] } }
    ).mock.calls[0]?.[0].where;
    expect(where).toMatchObject({ id: "r1", tenantId: "org_1", status: "QUEUED" });
    expect(prisma.paraRun.findFirst).not.toHaveBeenCalled();
  });

  it("startRun returns the claimed run when the conditional update wins", async () => {
    const running = { id: "r1", status: "RUNNING" };
    const prisma = makePrisma({
      paraRun: {
        updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
        findFirst: vi.fn().mockResolvedValueOnce(running),
      },
    });
    expect(await repo(prisma).startRun("r1")).toBe(running);
  });

  it("requeueRun only moves a parked run", async () => {
    const prisma = makePrisma({
      paraRun: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }) },
    });
    await repo(prisma).requeueRun("r1");
    const call = (
      prisma.paraRun.updateMany as unknown as {
        mock: { calls: [{ where: unknown; data: unknown }][] };
      }
    ).mock.calls[0]?.[0];
    expect(call?.where).toMatchObject({ status: "AWAITING_APPROVAL" });
    expect(call?.data).toMatchObject({ status: "QUEUED" });
  });

  it("decideApproval is conditional on PENDING so two clicks cannot spend twice", async () => {
    const prisma = makePrisma({
      paraApproval: { updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }), findFirst: vi.fn() },
    });
    await expect(repo(prisma).decideApproval("a1", "APPROVED", "user_1")).rejects.toBeInstanceOf(
      ApprovalAlreadyDecidedError,
    );
    expect(prisma.paraApproval.findFirst).not.toHaveBeenCalled();
  });

  it("decideApproval returns the decided row when it wins the race", async () => {
    const decided = { id: "a1", status: "APPROVED" };
    const prisma = makePrisma({
      paraApproval: {
        updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }),
        findFirst: vi.fn().mockResolvedValueOnce(decided),
      },
    });
    expect(await repo(prisma).decideApproval("a1", "APPROVED", "user_1")).toBe(decided);
  });
});
