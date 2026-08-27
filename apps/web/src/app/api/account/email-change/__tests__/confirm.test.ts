import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
  resolveServerRequestOrigin: () => "https://app.example",
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    authUser: {
      updateMany: vi.fn(),
    },
    authVerification: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedUserUpdate = vi.mocked(db.user.update);
const mockedAuthUserUpdateMany = vi.mocked(db.authUser.updateMany);
const mockedFindMany = vi.mocked(db.authVerification.findMany);
const mockedDelete = vi.mocked(db.authVerification.delete);

async function loadRoute() {
  return import("@/app/api/account/email-change/[token]/route");
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: null,
    orgId: null,
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: false,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

const validToken = "abcdefghijklmno1234567890";

function makeRequest() {
  return new Request(`https://app.example/api/account/email-change/${validToken}`, {
    method: "POST",
  });
}

function makeContext(token: string = validToken) {
  return { params: Promise.resolve({ token }) };
}

describe("POST /api/account/email-change/[token]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedFindUnique.mockReset();
    mockedUserUpdate.mockReset();
    mockedAuthUserUpdateMany.mockReset();
    mockedFindMany.mockReset();
    mockedDelete.mockReset();
    mockedAuthUserUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockedDelete.mockResolvedValue({ id: "v_1" } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for malformed tokens", async () => {
    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext("short"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when no verification row matches", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindMany.mockResolvedValue([] as never);
    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext());
    expect(response.status).toBe(404);
  });

  it("returns 410 when the verification has expired", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindMany.mockResolvedValue([
      {
        id: "v_1",
        identifier: "email-change:user_1",
        value: `alice2@example.com:${validToken}`,
        expiresAt: new Date(Date.now() - 1000),
      },
    ] as never);
    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext());
    expect(response.status).toBe(410);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("updates the user email and consumes the verification row", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindMany.mockResolvedValue([
      {
        id: "v_1",
        identifier: "email-change:user_1",
        value: `alice2@example.com:${validToken}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ] as never);
    mockedFindUnique.mockResolvedValue(null);
    mockedUserUpdate.mockResolvedValue({
      id: "user_1",
      email: "alice2@example.com",
    } as never);

    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; newEmail: string };
    expect(body.ok).toBe(true);
    expect(body.newEmail).toBe("alice2@example.com");
    expect(mockedUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { email: "alice2@example.com" },
    });
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: "v_1" } });
  });

  it("returns 403 when an active session belongs to a different user", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "user_other", isSignedIn: true }));
    mockedFindMany.mockResolvedValue([
      {
        id: "v_1",
        identifier: "email-change:user_1",
        value: `alice2@example.com:${validToken}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ] as never);
    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext());
    expect(response.status).toBe(403);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the address was claimed during the wait", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindMany.mockResolvedValue([
      {
        id: "v_1",
        identifier: "email-change:user_1",
        value: `alice2@example.com:${validToken}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ] as never);
    mockedFindUnique.mockResolvedValue({ id: "user_other" } as never);

    const { POST } = await loadRoute();
    const response = await POST(makeRequest(), makeContext());
    expect(response.status).toBe(409);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });
});
