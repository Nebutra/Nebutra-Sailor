/**
 * UsageLedger idempotency enforcement tests.
 *
 * The canonical contract (see docs/architecture/2026-04-18-event-flow.md):
 *   - every write to UsageLedgerEntry MUST carry an idempotencyKey
 *   - (organizationId, idempotencyKey) is unique at the DB layer
 *   - replaying the same key for the same tenant returns the first-write
 *     record untouched — trust first write
 *   - different tenants using the same idempotencyKey MUST both succeed
 *   - missing idempotencyKey is a 400
 *
 * The route under test: POST /api/v1/billing/usage
 * — a new thin route that claims a row in UsageLedgerEntry via the
 * UsageLedgerRepository.claim() atomic-create pattern.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that trigger route load.
// ---------------------------------------------------------------------------

const { mockClaim, mockVerifyToken } = vi.hoisted(() => ({
  mockClaim: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

// Test fixture — simulated in-memory ledger mapping (orgId, idempotencyKey)
// to the first-written entry. Drives mockClaim's behaviour.
type LedgerRow = {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  quantity: number;
};

const ledger = new Map<string, LedgerRow>();

function ledgerKey(orgId: string, idk: string): string {
  return `${orgId}::${idk}`;
}

vi.mock("@nebutra/repositories", () => ({
  UsageLedgerRepository: class {
    claim = mockClaim;
  },
}));

vi.mock("@nebutra/db", () => ({
  getTenantDb: () => ({}),
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
      }
    },
  },
}));

vi.mock("@nebutra/auth", () => ({
  verifyServiceToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// The route + tenant middleware are imported AFTER the mocks above so they
// pick up the mocked modules.
import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { usageLedgerRoutes } from "../routes/billing/usage.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function buildApp(): OpenAPIHono {
  const app = new OpenAPIHono();
  app.use("*", tenantContextMiddleware);
  app.route("/", usageLedgerRoutes);
  return app;
}

let app: OpenAPIHono;

async function postUsage(body: {
  organizationId: string;
  amount: number;
  idempotencyKey?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const authHeaders = s2sHeaders({
    userId: "user-test",
    orgId: body.organizationId,
    role: "admin",
  });

  const res = await app.request("/usage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      amount: body.amount,
      ...(body.idempotencyKey !== undefined && { idempotencyKey: body.idempotencyKey }),
    }),
  });

  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return { status: res.status, body: parsed };
}

async function ledgerCount(): Promise<number> {
  return ledger.size;
}

// ---------------------------------------------------------------------------
// Mock claim() — mirrors the atomic-create-or-return-existing contract.
// ---------------------------------------------------------------------------

function installClaimMock() {
  mockClaim.mockImplementation(
    async (input: { organizationId: string; idempotencyKey: string; quantity: number }) => {
      const key = ledgerKey(input.organizationId, input.idempotencyKey);
      const existing = ledger.get(key);
      if (existing) {
        return { claimed: false, entry: existing } as const;
      }
      const row: LedgerRow = {
        id: `row_${ledger.size + 1}`,
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
        quantity: input.quantity,
      };
      ledger.set(key, row);
      return { claimed: true, entry: row } as const;
    },
  );
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  ledger.clear();
  mockClaim.mockReset();
  mockVerifyToken.mockReset();
  process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;
  mockVerifyToken.mockReturnValue(true);
  installClaimMock();
  app = buildApp();
});

// ===========================================================================

describe("UsageLedger idempotency", () => {
  it("writes entry on first call", async () => {
    const res = await postUsage({
      organizationId: "org_1",
      amount: 100,
      idempotencyKey: "test-1",
    });
    expect(res.status).toBe(201);
    expect(await ledgerCount()).toBe(1);
  });

  it("returns 200 with original result on second call with same idempotencyKey", async () => {
    await postUsage({ organizationId: "org_1", amount: 100, idempotencyKey: "test-2" });
    const res = await postUsage({
      organizationId: "org_1",
      amount: 100,
      idempotencyKey: "test-2",
    });
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(await ledgerCount()).toBe(1);
  });

  it("allows different tenants to use same idempotencyKey", async () => {
    await postUsage({ organizationId: "org_1", amount: 100, idempotencyKey: "dup-key" });
    const res = await postUsage({
      organizationId: "org_2",
      amount: 50,
      idempotencyKey: "dup-key",
    });
    expect(res.status).toBe(201);
    expect(await ledgerCount()).toBe(2);
  });

  it("rejects 400 if idempotencyKey is missing", async () => {
    const res = await postUsage({ organizationId: "org_1", amount: 100 });
    expect(res.status).toBe(400);
  });

  it("returns stored result even if payload differs (trust first write)", async () => {
    await postUsage({ organizationId: "org_1", amount: 100, idempotencyKey: "first" });
    const r2 = await postUsage({
      organizationId: "org_1",
      amount: 999,
      idempotencyKey: "first",
    });
    expect(r2.body.amount).toBe(100);
    expect(await ledgerCount()).toBe(1);
  });
});
