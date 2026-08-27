import { describe, expect, it } from "vitest";
import {
  createAccessGate,
  createPrismaAccessInviteStore,
  hashInviteCode,
  type PrismaAccessGateClient,
} from "../index";

function createFakePrisma(): PrismaAccessGateClient & {
  codes: Record<string, unknown>[];
  redemptions: Record<string, unknown>[];
} {
  const codes: Record<string, unknown>[] = [];
  const redemptions: Record<string, unknown>[] = [];
  const client = {
    codes,
    redemptions,
    accessInviteCode: {
      async count(args: { where: { issuedByUserId: string } }) {
        return codes.filter((code) => code.issuedByUserId === args.where.issuedByUserId).length;
      },
      async createMany(args: { data: Record<string, unknown>[] }) {
        codes.push(...args.data);
        return { count: args.data.length };
      },
      async findUnique(args: { where: { codeHash: string } }) {
        return codes.find((code) => code.codeHash === args.where.codeHash) ?? null;
      },
      async updateMany(args: {
        where: { id: string; status: string; redemptionCount: number };
        data: Record<string, unknown>;
      }) {
        const code = codes.find(
          (candidate) =>
            candidate.id === args.where.id &&
            candidate.status === args.where.status &&
            candidate.redemptionCount === args.where.redemptionCount,
        );
        if (!code) return { count: 0 };
        Object.assign(code, args.data);
        return { count: 1 };
      },
      async update(args: { where: { codeHash: string }; data: Record<string, unknown> }) {
        const code = codes.find((candidate) => candidate.codeHash === args.where.codeHash);
        if (!code) throw new Error("not found");
        Object.assign(code, args.data);
        return code;
      },
    },
    accessInviteRedemption: {
      async create(args: { data: Record<string, unknown> }) {
        redemptions.push(args.data);
        return args.data;
      },
    },
    async $transaction<T>(fn: (tx: PrismaAccessGateClient) => Promise<T>) {
      return fn(client);
    },
  };
  return client;
}

describe("createPrismaAccessInviteStore", () => {
  it("maps service invites to Prisma rows without plaintext and redeems with compare-and-swap", async () => {
    const prisma = createFakePrisma();
    const gate = createAccessGate({
      store: createPrismaAccessInviteStore(prisma),
      issuerQuota: 1,
      now: () => new Date("2026-05-17T00:00:00Z"),
      generateCode: () => "neb_deterministic",
    });

    const [issued] = await gate.issueBatch({
      count: 1,
      issuedByUserId: "user_admin",
      scope: "tenant",
      tenantId: "org_1",
    });

    const codeHash = await hashInviteCode(issued?.plaintextCode ?? "");
    expect(prisma.codes[0]).toMatchObject({
      codeHash,
      codePrefix: "neb_determin",
      scope: "TENANT",
      status: "ACTIVE",
      tenantId: "org_1",
    });
    expect(JSON.stringify(prisma.codes[0])).not.toContain("neb_deterministic");

    const result = await gate.redeem({
      plaintextCode: issued?.plaintextCode ?? "",
      redeemedByUserId: "user_new",
      tenantId: "org_1",
    });

    expect(result.scope).toBe("tenant");
    expect(result.invite.status).toBe("redeemed");
    expect(prisma.redemptions[0]).toMatchObject({
      inviteCodeId: result.invite.id,
      userId: "user_new",
      tenantId: "org_1",
    });

    await expect(
      gate.redeem({
        plaintextCode: issued?.plaintextCode ?? "",
        redeemedByUserId: "user_other",
        tenantId: "org_1",
      }),
    ).rejects.toThrow("Invite code is not active");
  });
});
