import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
  resolveServerRequestOrigin: () => "https://app.example",
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    authVerification: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@nebutra/email", () => ({
  getEmailProvider: () => ({
    send: vi.fn(async () => ({ id: "msg_1" })),
  }),
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedDeleteMany = vi.mocked(db.authVerification.deleteMany);
const mockedCreate = vi.mocked(db.authVerification.create);

async function loadRoute() {
  return import("@/app/api/account/email-change/route");
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

describe("POST /api/account/email-change", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedFindUnique.mockReset();
    mockedDeleteMany.mockReset();
    mockedCreate.mockReset();
    mockedDeleteMany.mockResolvedValue({ count: 0 } as never);
    mockedCreate.mockResolvedValue({ id: "v_1" } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "x@example.com" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid email", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "not-an-email" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when new email matches current", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique.mockResolvedValueOnce({
      id: "user_1",
      email: "alice@example.com",
      name: "Alice",
    } as never);
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "alice@example.com" }),
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("EMAIL_UNCHANGED");
  });

  it("returns 409 when new email is already taken", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique
      .mockResolvedValueOnce({
        id: "user_1",
        email: "alice@example.com",
        name: "Alice",
      } as never)
      .mockResolvedValueOnce({ id: "user_2" } as never);
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "taken@example.com" }),
      }),
    );
    expect(response.status).toBe(409);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("EMAIL_TAKEN");
  });

  it("returns 202 + writes a verification row + deletes prior rows", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique
      .mockResolvedValueOnce({
        id: "user_1",
        email: "alice@example.com",
        name: "Alice",
      } as never)
      .mockResolvedValueOnce(null);
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "alice2@example.com" }),
      }),
    );
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      ok: boolean;
      verificationSent: boolean;
      newEmail: string;
    };
    expect(body.ok).toBe(true);
    expect(body.verificationSent).toBe(true);
    expect(body.newEmail).toBe("alice2@example.com");
    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-change:user_1" },
    });
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: "email-change:user_1",
          value: expect.stringMatching(/^alice2@example\.com:[A-Za-z0-9_-]+$/),
        }),
      }),
    );
  });
});
