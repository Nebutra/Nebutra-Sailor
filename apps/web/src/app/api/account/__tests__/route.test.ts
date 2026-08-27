import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
  resolveServerRequestOrigin: () => "https://app.example",
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    authVerification: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const sendEmailChangeEmail = vi.fn(async () => ({ id: "msg_1" }));
vi.mock("@nebutra/email", () => ({
  sendEmailChangeEmail: (...args: unknown[]) => sendEmailChangeEmail(...(args as [])),
}));

const auditLog = vi.fn(async () => undefined);
vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: auditLog }),
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedUserUpdate = vi.mocked(db.user.update);
const mockedUserFindUnique = vi.mocked(db.user.findUnique);
const mockedVerificationDeleteMany = vi.mocked(db.authVerification.deleteMany);
const mockedVerificationCreate = vi.mocked(db.authVerification.create);

async function loadRoute() {
  return import("@/app/api/account/route");
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

describe("PATCH /api/account", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedUserUpdate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when neither name nor language is provided", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("updates the user name when provided", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUserUpdate.mockResolvedValue({
      id: "user_1",
      name: "Alice B",
      email: "alice@example.com",
    } as never);

    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice B" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; user: { name: string } };
    expect(body.ok).toBe(true);
    expect(body.user.name).toBe("Alice B");
    expect(mockedUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: { name: "Alice B" },
      }),
    );
  });

  it("accepts language without writing the user row", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "zh" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { language: string };
    expect(body.language).toBe("zh-Hans-CN");
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects an unsupported language value", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "pt-BR" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/account (email change)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedUserFindUnique.mockReset();
    mockedVerificationDeleteMany.mockReset();
    mockedVerificationCreate.mockReset();
    sendEmailChangeEmail.mockClear();
    auditLog.mockClear();
    mockedVerificationDeleteMany.mockResolvedValue({ count: 0 } as never);
    mockedVerificationCreate.mockResolvedValue({ id: "v_1" } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "new@example.com" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when newEmail is invalid", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "nope" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("persists a pending change and dispatches the verification mail", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUserFindUnique
      .mockResolvedValueOnce({
        id: "user_1",
        email: "alice@example.com",
        name: "Alice",
      } as never)
      // Second lookup: is the target address already claimed?
      .mockResolvedValueOnce(null);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account", {
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

    // The pending change is persisted with an expiry, and any earlier pending
    // request for this user is cleared first.
    expect(mockedVerificationDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-change:user_1" },
    });
    const created = mockedVerificationCreate.mock.calls[0]?.[0] as unknown as {
      data: { identifier: string; value: string; expiresAt: Date };
    };
    expect(created.data.identifier).toBe("email-change:user_1");
    expect(created.data.value.startsWith("alice2@example.com:")).toBe(true);
    expect(created.data.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // The mail goes to the *new* address, carrying the minted token.
    expect(sendEmailChangeEmail).toHaveBeenCalledTimes(1);
    const mailArgs = sendEmailChangeEmail.mock.calls[0]?.[0] as unknown as {
      to: string;
      confirmUrl: string;
    };
    expect(mailArgs.to).toBe("alice2@example.com");
    const mintedToken = created.data.value.split(":").pop() as string;
    expect(mailArgs.confirmUrl).toContain(mintedToken);
  });

  it("rejects an address that is already in use", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUserFindUnique
      .mockResolvedValueOnce({
        id: "user_1",
        email: "alice@example.com",
        name: "Alice",
      } as never)
      .mockResolvedValueOnce({ id: "user_other" } as never);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "taken@example.com" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mockedVerificationCreate).not.toHaveBeenCalled();
    expect(sendEmailChangeEmail).not.toHaveBeenCalled();
  });
});
