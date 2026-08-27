import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireOrg: vi.fn(),
}));

vi.mock("@nebutra/notifications", async () => {
  const actual =
    await vi.importActual<typeof import("@nebutra/notifications")>("@nebutra/notifications");
  return {
    ...actual,
    getNotificationProvider: vi.fn(),
  };
});

import {
  getNotificationProvider,
  NotificationNotFoundError,
  NotificationUnsupportedOperationError,
} from "@nebutra/notifications";
import { requireOrg } from "@/lib/auth";

const mockedRequireOrg = vi.mocked(requireOrg);
const mockedGetProvider = vi.mocked(getNotificationProvider);

type ProviderStub = Record<string, unknown>;

function useProvider(provider: ProviderStub): void {
  mockedGetProvider.mockResolvedValue(
    provider as unknown as Awaited<ReturnType<typeof getNotificationProvider>>,
  );
}

async function loadIdRoute() {
  return import("@/app/api/notifications/[id]/route");
}

function patchRequest(body: unknown): Request {
  return new Request("https://app.example/api/notifications/n1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeContext = { params: Promise.resolve({ id: "n1" }) };

describe("PATCH /api/notifications/[id] — read: false", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedRequireOrg.mockReset();
    mockedGetProvider.mockReset();
    mockedRequireOrg.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls provider.markAsUnread with notification, user and tenant ids", async () => {
    const markAsUnread = vi.fn().mockResolvedValue(undefined);
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    useProvider({ name: "direct", markAsRead, markAsUnread });

    const { PATCH } = await loadIdRoute();
    const response = await PATCH(patchRequest({ read: false }), routeContext);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({ id: "n1", read: false });
    expect(markAsUnread).toHaveBeenCalledWith("n1", "user_1", "org_1");
    expect(markAsRead).not.toHaveBeenCalled();
  });

  it("never reports success when the provider has no markAsUnread", async () => {
    useProvider({ name: "direct", markAsRead: vi.fn() });

    const { PATCH } = await loadIdRoute();
    const response = await PATCH(patchRequest({ read: false }), routeContext);
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("unread");
  });

  it("maps an unsupported-operation error from the provider to 501", async () => {
    useProvider({
      name: "direct",
      markAsRead: vi.fn(),
      markAsUnread: vi
        .fn()
        .mockRejectedValue(
          new NotificationUnsupportedOperationError(
            "markAsUnread",
            "direct",
            "the configured in-app store does not implement markAsUnread",
          ),
        ),
    });

    const { PATCH } = await loadIdRoute();
    const response = await PATCH(patchRequest({ read: false }), routeContext);
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("markAsUnread");
  });

  it("returns 404 when the id is not the caller's notification", async () => {
    useProvider({
      name: "direct",
      markAsRead: vi.fn(),
      markAsUnread: vi.fn().mockRejectedValue(new NotificationNotFoundError("n1")),
    });

    const { PATCH } = await loadIdRoute();
    const response = await PATCH(patchRequest({ read: false }), routeContext);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
  });

  it("returns 500 when the provider fails for an ordinary reason", async () => {
    useProvider({
      name: "direct",
      markAsRead: vi.fn(),
      markAsUnread: vi.fn().mockRejectedValue(new Error("database unreachable")),
    });

    const { PATCH } = await loadIdRoute();
    const response = await PATCH(patchRequest({ read: false }), routeContext);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
  });
});
