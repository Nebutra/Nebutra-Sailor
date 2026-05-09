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
  return import("@/app/api/account/avatar/route");
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

describe("POST /api/account/avatar", () => {
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
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/png" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns presigned upload payload for a valid presign request", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/png", contentLength: 1024 }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      url: string;
      method: string;
      key: string;
      headers: Record<string, string>;
    };
    expect(body.method).toBe("PUT");
    expect(body.key).toMatch(/^user-avatars\/user_1\/.*\.png$/);
    expect(body.url).toBeTruthy();
    expect(body.headers["content-type"]).toBe("image/png");
  });

  it("rejects unsupported content types", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/gif", contentLength: 100 }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects oversized files", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/png", contentLength: 3 * 1024 * 1024 }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("finalizes a valid key by writing avatarUrl on the user row", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUserUpdate.mockResolvedValue({
      id: "user_1",
      name: "Alice",
      email: "alice@example.com",
      avatarUrl: "user-avatars/user_1/123.png",
    } as never);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "user-avatars/user_1/123.png" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: { avatarUrl: string }; avatarUrl: string };
    expect(decodeURIComponent(body.user.avatarUrl)).toContain("user-avatars/user_1/123.png");
    expect(decodeURIComponent(body.avatarUrl)).toContain("user-avatars/user_1/123.png");
    expect(mockedUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: { avatarUrl: "user-avatars/user_1/123.png" },
      }),
    );
  });

  it("rejects a finalize key that does not match the user", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "user-avatars/user_other/123.png" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mockedUserUpdate).not.toHaveBeenCalled();
  });
});
