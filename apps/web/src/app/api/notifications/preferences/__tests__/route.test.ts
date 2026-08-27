import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireOrg: vi.fn(),
}));

const mockProvider = {
  name: "direct" as const,
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
};

vi.mock("@nebutra/notifications", async () => {
  const actual =
    await vi.importActual<typeof import("@nebutra/notifications")>("@nebutra/notifications");
  return {
    ...actual,
    getNotificationProvider: vi.fn(),
    resolveNotificationRuntimeStatus: vi.fn(),
  };
});

import { getNotificationProvider, resolveNotificationRuntimeStatus } from "@nebutra/notifications";
import { requireOrg } from "@/lib/auth";

const mockedRequireOrg = vi.mocked(requireOrg);
const mockedGetProvider = vi.mocked(getNotificationProvider);
const mockedResolveRuntime = vi.mocked(resolveNotificationRuntimeStatus);

async function loadRoute() {
  return import("@/app/api/notifications/preferences/route");
}

function jsonRequest(method: "GET" | "PATCH", body?: unknown): Request {
  return new Request("https://app.example/api/notifications/preferences", {
    method,
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/notifications/preferences route", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedRequireOrg.mockReset();
    mockedGetProvider.mockReset();
    mockedResolveRuntime.mockReset();
    mockProvider.getPreferences.mockReset();
    mockProvider.updatePreferences.mockReset();

    mockedRequireOrg.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mockedGetProvider.mockResolvedValue(
      mockProvider as unknown as Awaited<ReturnType<typeof getNotificationProvider>>,
    );
    mockedResolveRuntime.mockReturnValue({
      provider: "direct",
      providerLabel: "Direct",
      mode: "self_hosted",
      canManagePreferences: true,
      canViewInbox: true,
      canMarkInboxRead: true,
      summary: "Direct adapters connected.",
      missing: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("returns 200 with preferences shape from provider", async () => {
      mockProvider.getPreferences.mockResolvedValue([
        {
          userId: "user_1",
          tenantId: "org_1",
          channel: "email",
          enabled: true,
          frequency: "immediate",
          disabledCategories: ["product.marketing"],
          updatedAt: new Date().toISOString(),
        },
      ]);

      const { GET } = await loadRoute();
      const response = await GET(jsonRequest("GET"));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.preferences).toBeDefined();
      // product.marketing on email should be disabled
      expect(payload.data.preferences["product.marketing"]?.email).toBe(false);
    });

    it("falls back to defaults when runtime cannot manage preferences", async () => {
      mockedResolveRuntime.mockReturnValue({
        provider: "direct",
        providerLabel: "Direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        summary: "preview",
        reason: "no provider",
        missing: ["adapters"],
      });

      const { GET } = await loadRoute();
      const response = await GET(jsonRequest("GET"));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.preferences).toEqual({});
      expect(payload.data.readOnly).toBe(true);
    });
  });

  describe("PATCH", () => {
    it("returns 400 when payload is invalid", async () => {
      const { PATCH } = await loadRoute();
      const response = await PATCH(
        jsonRequest("PATCH", { eventType: "not.a.real.type", channel: "email", enabled: true }),
      );
      expect(response.status).toBe(400);
    });

    it("returns 403 when runtime is read-only", async () => {
      mockedResolveRuntime.mockReturnValue({
        provider: "direct",
        providerLabel: "Direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        summary: "preview",
        missing: [],
      });

      const { PATCH } = await loadRoute();
      const response = await PATCH(
        jsonRequest("PATCH", {
          eventType: "account.security",
          channel: "email",
          enabled: false,
        }),
      );
      expect(response.status).toBe(403);
    });

    it("invokes provider.updatePreferences with correct shape", async () => {
      mockProvider.getPreferences.mockResolvedValue([]);
      mockProvider.updatePreferences.mockResolvedValue(undefined);

      const { PATCH } = await loadRoute();
      const response = await PATCH(
        jsonRequest("PATCH", {
          eventType: "account.security",
          channel: "email",
          enabled: false,
        }),
      );

      expect(response.status).toBe(200);
      expect(mockProvider.updatePreferences).toHaveBeenCalledTimes(1);
      const [userId, updates, tenantId] = mockProvider.updatePreferences.mock.calls[0]!;
      expect(userId).toBe("user_1");
      expect(tenantId).toBe("org_1");
      expect(updates[0].channel).toBe("email");
      expect(updates[0].disabledCategories).toContain("account.security");
    });

    it("returns 500 when provider write fails", async () => {
      mockProvider.getPreferences.mockResolvedValue([]);
      mockProvider.updatePreferences.mockRejectedValue(new Error("storage offline"));

      const { PATCH } = await loadRoute();
      const response = await PATCH(
        jsonRequest("PATCH", {
          eventType: "account.security",
          channel: "email",
          enabled: false,
        }),
      );
      expect(response.status).toBe(500);
    });
  });
});
