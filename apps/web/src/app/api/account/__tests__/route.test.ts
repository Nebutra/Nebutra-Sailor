import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedUserUpdate = vi.mocked(db.user.update);

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
    expect(body.language).toBe("zh");
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects an unsupported language value", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new Request("https://app.example/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "fr" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/account (email change)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
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

  it("returns 200 with verificationSent on a valid request", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "alice2@example.com" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      verificationSent: boolean;
      newEmail: string;
    };
    expect(body.ok).toBe(true);
    expect(body.verificationSent).toBe(true);
    expect(body.newEmail).toBe("alice2@example.com");
  });
});
