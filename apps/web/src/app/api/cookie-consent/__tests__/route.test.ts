import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cookieConsent: {
      upsert: vi.fn(),
    },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedUpsert = vi.mocked(db.cookieConsent.upsert);

async function loadRoute() {
  return import("../route");
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

function buildBody(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    visitorId: "visitor_abc",
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
    timestamp: now,
    expiresAt: now + 365 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new Request("https://app.example/api/cookie-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/cookie-consent", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedUpsert.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 for an anonymous valid payload (no userId)", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUpsert.mockResolvedValue({ id: "cc_1" } as unknown as Awaited<
      ReturnType<typeof db.cookieConsent.upsert>
    >);

    const { POST } = await loadRoute();
    const response = await POST(postRequest(buildBody()));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockedUpsert).toHaveBeenCalledTimes(1);
    const args = mockedUpsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(args.create.userId).toBeNull();
  });

  it("attaches the userId when the request is signed in", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "user_42", isSignedIn: true }));
    mockedUpsert.mockResolvedValue({ id: "cc_2" } as unknown as Awaited<
      ReturnType<typeof db.cookieConsent.upsert>
    >);

    const { POST } = await loadRoute();
    const response = await POST(postRequest(buildBody()));

    expect(response.status).toBe(200);
    const args = mockedUpsert.mock.calls[0]?.[0] as { create: Record<string, unknown> };
    expect(args.create.userId).toBe("user_42");
  });

  it("returns 400 for an invalid body (missing required fields)", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());

    const { POST } = await loadRoute();
    const response = await POST(postRequest({ functional: true }));

    expect(response.status).toBe(400);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("forces necessary=true even if the body says false", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedUpsert.mockResolvedValue({ id: "cc_3" } as unknown as Awaited<
      ReturnType<typeof db.cookieConsent.upsert>
    >);

    const { POST } = await loadRoute();
    await POST(postRequest(buildBody({ necessary: false })));

    const args = mockedUpsert.mock.calls[0]?.[0] as { create: Record<string, unknown> };
    expect(args.create.necessary).toBe(true);
  });
});
