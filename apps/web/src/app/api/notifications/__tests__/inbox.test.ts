import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireOrg: vi.fn(),
}));

const mockProvider = {
  name: "direct" as const,
  getInAppNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
};

vi.mock("@nebutra/notifications", async () => {
  const actual =
    await vi.importActual<typeof import("@nebutra/notifications")>("@nebutra/notifications");
  return {
    ...actual,
    getNotificationProvider: vi.fn(),
  };
});

import { getNotificationProvider } from "@nebutra/notifications";
import { requireOrg } from "@/lib/auth";

const mockedRequireOrg = vi.mocked(requireOrg);
const mockedGetProvider = vi.mocked(getNotificationProvider);

async function loadInboxRoute() {
  return import("@/app/api/notifications/inbox/route");
}

async function loadIdRoute() {
  return import("@/app/api/notifications/[id]/route");
}

function jsonRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/notifications/inbox + /api/notifications/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedRequireOrg.mockReset();
    mockedGetProvider.mockReset();
    mockProvider.getInAppNotifications.mockReset();
    mockProvider.markAsRead.mockReset();
    mockProvider.markAllAsRead.mockReset();

    mockedRequireOrg.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mockedGetProvider.mockResolvedValue(
      mockProvider as unknown as Awaited<ReturnType<typeof getNotificationProvider>>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /inbox", () => {
    it("returns notifications + unreadCount from provider", async () => {
      const now = new Date().toISOString();
      mockProvider.getInAppNotifications.mockResolvedValue({
        notifications: [
          {
            id: "n1",
            userId: "user_1",
            tenantId: "org_1",
            type: "billing.invoice",
            title: "Invoice paid",
            body: "Thanks!",
            data: {},
            read: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
        total: 1,
        unreadCount: 1,
      });

      const { GET } = await loadInboxRoute();
      const response = await GET(jsonRequest("GET", "https://app.example/api/notifications/inbox"));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.notifications).toHaveLength(1);
      expect(payload.data.unreadCount).toBe(1);
      expect(mockProvider.getInAppNotifications).toHaveBeenCalledWith(
        "user_1",
        expect.objectContaining({ limit: 20 }),
        "org_1",
      );
    });

    it("respects limit + unreadOnly query params", async () => {
      mockProvider.getInAppNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      });

      const { GET } = await loadInboxRoute();
      const response = await GET(
        jsonRequest("GET", "https://app.example/api/notifications/inbox?limit=5&unreadOnly=true"),
      );

      expect(response.status).toBe(200);
      expect(mockProvider.getInAppNotifications).toHaveBeenCalledWith(
        "user_1",
        expect.objectContaining({ limit: 5, unreadOnly: true }),
        "org_1",
      );
    });

    it("returns empty inbox + 200 when provider unavailable", async () => {
      mockedGetProvider.mockRejectedValue(new Error("not configured"));

      const { GET } = await loadInboxRoute();
      const response = await GET(jsonRequest("GET", "https://app.example/api/notifications/inbox"));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.notifications).toEqual([]);
      expect(payload.data.unreadCount).toBe(0);
    });
  });

  describe("PATCH /[id]", () => {
    it("calls provider.markAsRead with notification + user ids", async () => {
      mockProvider.markAsRead.mockResolvedValue(undefined);

      const { PATCH } = await loadIdRoute();
      const response = await PATCH(
        jsonRequest("PATCH", "https://app.example/api/notifications/n1", { read: true }),
        { params: Promise.resolve({ id: "n1" }) },
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(mockProvider.markAsRead).toHaveBeenCalledWith("n1", "user_1", "org_1");
    });

    it("returns 400 when body is invalid", async () => {
      const { PATCH } = await loadIdRoute();
      const response = await PATCH(
        jsonRequest("PATCH", "https://app.example/api/notifications/n1", { read: "yes" }),
        { params: Promise.resolve({ id: "n1" }) },
      );
      expect(response.status).toBe(400);
    });

    it("returns 503 when provider unavailable on PATCH", async () => {
      mockedGetProvider.mockRejectedValue(new Error("not configured"));

      const { PATCH } = await loadIdRoute();
      const response = await PATCH(
        jsonRequest("PATCH", "https://app.example/api/notifications/n1", { read: true }),
        { params: Promise.resolve({ id: "n1" }) },
      );
      expect(response.status).toBe(503);
    });
  });

  describe("DELETE /[id]", () => {
    it("soft-archives via markAsRead", async () => {
      mockProvider.markAsRead.mockResolvedValue(undefined);

      const { DELETE } = await loadIdRoute();
      const response = await DELETE(
        jsonRequest("DELETE", "https://app.example/api/notifications/n1"),
        { params: Promise.resolve({ id: "n1" }) },
      );

      expect(response.status).toBe(200);
      expect(mockProvider.markAsRead).toHaveBeenCalledWith("n1", "user_1", "org_1");
    });
  });
});
