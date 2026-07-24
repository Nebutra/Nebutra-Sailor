import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  email: string;
  position: number;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  status: "waiting" | "admitted";
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  admittedAt: Date | null;
};

const mocks = vi.hoisted(() => {
  const rows: Row[] = [];

  return {
    rows,
    delegate: {
      async create(args: { data: Record<string, unknown> }) {
        const row: Row = {
          id: String(args.data.id),
          email: String(args.data.email),
          position: rows.length + 1,
          referralCode: String(args.data.referralCode),
          referredBy: typeof args.data.referredBy === "string" ? args.data.referredBy : null,
          referralCount: Number(args.data.referralCount),
          status: args.data.status === "admitted" ? "admitted" : "waiting",
          metadata:
            args.data.metadata && typeof args.data.metadata === "object"
              ? (args.data.metadata as Record<string, unknown>)
              : null,
          createdAt: args.data.createdAt as Date,
          admittedAt: args.data.admittedAt instanceof Date ? args.data.admittedAt : null,
        };
        rows.push(row);
        return row;
      },
      async findUnique(args: {
        where: { email?: string; referralCode?: string; id?: string };
      }): Promise<Row | null> {
        if (args.where.email) {
          return rows.find((row) => row.email === args.where.email) ?? null;
        }
        if (args.where.referralCode) {
          return rows.find((row) => row.referralCode === args.where.referralCode) ?? null;
        }
        if (args.where.id) {
          return rows.find((row) => row.id === args.where.id) ?? null;
        }
        return null;
      },
      async findMany(args?: {
        where?: { status?: "waiting" | "admitted" };
        skip?: number;
        take?: number;
      }) {
        const filtered = args?.where?.status
          ? rows.filter((row) => row.status === args.where?.status)
          : rows;
        return filtered.slice(args?.skip ?? 0, (args?.skip ?? 0) + (args?.take ?? filtered.length));
      },
      async count(args?: { where?: { status?: "waiting" | "admitted" } }) {
        if (args?.where?.status) {
          return rows.filter((row) => row.status === args.where?.status).length;
        }
        return rows.length;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const index = rows.findIndex((row) => row.id === args.where.id);
        if (index < 0) throw new Error("row not found");
        const current = rows[index];
        const updated = { ...current, ...args.data } as Row;
        rows[index] = updated;
        return updated;
      },
    },
  };
});

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({ waitlistEntry: mocks.delegate }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

import { POST } from "../route";

function request(body: unknown): NextRequest {
  return new Request("https://nebutra.com/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://nebutra.com",
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    mocks.rows.length = 0;
  });

  it("joins the public waitlist with any normalized referral code", async () => {
    const res = await POST(
      request({
        email: "Founder@Example.com",
        code: " abcd-2345 ",
        landingPage: "https://nebutra.com/refer?code=abcd-2345",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.entry.email).toBe("founder@example.com");
    expect(body.entry.position).toBe(1);
    expect(body.entry.referralUrl).toContain("https://nebutra.com/refer?code=");
    expect(body.attribution).toMatchObject({
      attemptedReferralCode: "ABCD2345",
      acceptedReferralCode: null,
      wasReferred: false,
    });
    expect(mocks.rows[0]?.metadata).toMatchObject({
      attemptedReferralCode: "ABCD2345",
      source: "refer-page",
    });
  });

  it("attributes signups when the referral code exists", async () => {
    const first = await POST(request({ email: "first@example.com" }));
    const firstBody = await first.json();

    const second = await POST(
      request({
        email: "second@example.com",
        code: firstBody.entry.referralCode.toLowerCase(),
      }),
    );
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.attribution).toMatchObject({
      acceptedReferralCode: firstBody.entry.referralCode,
      wasReferred: true,
    });
    expect(mocks.rows[0]?.referralCount).toBe(1);
  });

  it("returns 400 for malformed email input", async () => {
    const res = await POST(request({ email: "not-an-email" }));

    expect(res.status).toBe(400);
  });
});
