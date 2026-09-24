import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildNotificationPreferenceUpdateMock,
  createNotificationProviderMock,
  createPrismaNotificationStoresMock,
  getNotificationProviderMock,
  getSystemDbMock,
  loadNotificationSettingsSnapshotMock,
  resolveNotificationRuntimeStatusMock,
  verifyServiceTokenMock,
} = vi.hoisted(() => ({
  buildNotificationPreferenceUpdateMock: vi.fn(),
  createNotificationProviderMock: vi.fn(),
  createPrismaNotificationStoresMock: vi.fn(),
  getNotificationProviderMock: vi.fn(),
  getSystemDbMock: vi.fn(),
  loadNotificationSettingsSnapshotMock: vi.fn(),
  resolveNotificationRuntimeStatusMock: vi.fn(),
  verifyServiceTokenMock: vi.fn(),
}));

vi.mock("@nebutra/notifications", () => ({
  buildNotificationPreferenceUpdate: buildNotificationPreferenceUpdateMock,
  createNotificationProvider: createNotificationProviderMock,
  createPrismaNotificationStores: createPrismaNotificationStoresMock,
  getNotificationProvider: getNotificationProviderMock,
  loadNotificationSettingsSnapshot: loadNotificationSettingsSnapshotMock,
  resolveNotificationRuntimeStatus: resolveNotificationRuntimeStatusMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: getSystemDbMock,
}));

vi.mock("@nebutra/auth", () => ({
  verifyServiceToken: (...args: unknown[]) => verifyServiceTokenMock(...args),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

// The route module memoizes its Prisma-backed direct provider at module
// scope, so each test resets the module registry and re-imports the routes
// to get a fresh, unmemoized provider.
async function buildApp(): Promise<OpenAPIHono> {
  vi.resetModules();
  const { notificationRoutes } = await import("../routes/notifications/index.js");
  const app = new OpenAPIHono();
  app.use("*", tenantContextMiddleware);
  app.route("/", notificationRoutes);
  return app;
}

async function authHeaders(orgId = "org_alpha") {
  return s2sHeaders({
    userId: "user_alpha",
    orgId,
    role: "admin",
    plan: "PRO",
  });
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function runtimeStatus() {
  return {
    provider: "direct",
    providerLabel: "Direct",
    mode: "self_hosted",
    canManagePreferences: true,
    canViewInbox: true,
    canMarkInboxRead: true,
    summary: "Direct delivery adapters are connected.",
    missing: [],
  };
}

/**
 * Wire up the standard Prisma-backed direct provider path: the route always
 * builds its provider through `createPrismaNotificationStores` +
 * `createNotificationProvider`.
 */
function mockDirectProvider(overrides: Record<string, unknown> = {}) {
  const db = { notification: {}, notificationPreference: {} };
  const stores = {
    inAppStore: { kind: "in-app-store" },
    preferenceStore: { kind: "preference-store" },
  };
  const provider = {
    name: "direct",
    getRuntimeMetadata: vi.fn().mockReturnValue({
      provider: "direct",
      preferenceStoreMode: "adapter",
      inAppStoreMode: "adapter",
    }),
    ...overrides,
  };
  getSystemDbMock.mockReturnValue(db);
  createPrismaNotificationStoresMock.mockReturnValue(stores);
  createNotificationProviderMock.mockResolvedValue(provider);
  return { db, stores, provider };
}

describe("notification routes", () => {
  let app: OpenAPIHono;

  beforeEach(async () => {
    process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;
    delete process.env.NOTIFICATION_PROVIDER;
    buildNotificationPreferenceUpdateMock.mockReset();
    createNotificationProviderMock.mockReset();
    createPrismaNotificationStoresMock.mockReset();
    getNotificationProviderMock.mockReset();
    getSystemDbMock.mockReset();
    loadNotificationSettingsSnapshotMock.mockReset();
    resolveNotificationRuntimeStatusMock.mockReset();
    verifyServiceTokenMock.mockReset();
    verifyServiceTokenMock.mockReturnValue(true);
    resolveNotificationRuntimeStatusMock.mockReturnValue(runtimeStatus());
    app = await buildApp();
  });

  it("uses Prisma-backed direct stores for the default self-hosted notification provider", async () => {
    const { db, stores, provider } = mockDirectProvider({
      getInAppNotifications: vi.fn().mockResolvedValue({
        notifications: [],
        total: 0,
        unreadCount: 0,
      }),
    });

    const response = await app.request("/?limit=10", {
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(getSystemDbMock).toHaveBeenCalledTimes(1);
    expect(createPrismaNotificationStoresMock).toHaveBeenCalledWith(db);
    expect(createNotificationProviderMock).toHaveBeenCalledWith({
      provider: "direct",
      inAppStore: stores.inAppStore,
      preferenceStore: stores.preferenceStore,
    });
    expect(getNotificationProviderMock).not.toHaveBeenCalled();
    expect(provider.getInAppNotifications).toHaveBeenCalledWith(
      "user_alpha",
      { limit: 10, offset: 0 },
      "org_alpha",
    );
  });

  it("lists notifications through the provider for the authenticated tenant", async () => {
    const { provider } = mockDirectProvider({
      getInAppNotifications: vi.fn().mockResolvedValue({
        notifications: [
          {
            id: "notif_1",
            userId: "user_alpha",
            tenantId: "org_alpha",
            type: "workspace.invitation",
            title: "Workspace invitation",
            body: "You were invited.",
            data: { href: "/en/settings/team" },
            read: false,
            createdAt: "2026-04-29T01:00:00.000Z",
            updatedAt: "2026-04-29T01:00:00.000Z",
          },
        ],
        total: 1,
        unreadCount: 1,
      }),
    });

    const response = await app.request("/?limit=10&offset=2&unreadOnly=true", {
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(provider.getInAppNotifications).toHaveBeenCalledWith(
      "user_alpha",
      { limit: 10, offset: 2, unreadOnly: true },
      "org_alpha",
    );
    await expect(readJson(response)).resolves.toEqual({
      items: [
        {
          id: "notif_1",
          userId: "user_alpha",
          tenantId: "org_alpha",
          type: "workspace.invitation",
          title: "Workspace invitation",
          body: "You were invited.",
          data: { href: "/en/settings/team" },
          read: false,
          createdAt: "2026-04-29T01:00:00.000Z",
          updatedAt: "2026-04-29T01:00:00.000Z",
        },
      ],
      total: 1,
      unreadCount: 1,
    });
  });

  it("returns notification settings from the shared settings snapshot service", async () => {
    mockDirectProvider();
    loadNotificationSettingsSnapshotMock.mockResolvedValue({
      runtime: runtimeStatus(),
      channels: [],
      preferenceSource: "provider",
      preferences: [],
      sections: [],
      inboxSource: "provider",
      inboxItems: [],
      unreadCount: 0,
    });

    const response = await app.request("/settings", {
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(loadNotificationSettingsSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_alpha",
        tenantId: "org_alpha",
        inboxLimit: 20,
      }),
    );
    await expect(readJson(response)).resolves.toMatchObject({
      preferenceSource: "provider",
      unreadCount: 0,
    });
  });

  it("returns unread notification count without fetching the full settings matrix", async () => {
    const { provider } = mockDirectProvider({
      getInAppNotifications: vi.fn().mockResolvedValue({
        notifications: [],
        total: 7,
        unreadCount: 3,
      }),
    });

    const response = await app.request("/unread-count", {
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(provider.getInAppNotifications).toHaveBeenCalledWith(
      "user_alpha",
      { limit: 1, unreadOnly: true },
      "org_alpha",
    );
    await expect(readJson(response)).resolves.toEqual({ count: 3 });
  });

  it("marks selected notifications as read", async () => {
    const { provider } = mockDirectProvider({
      markAsReadBatch: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request("/mark-read", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({ ids: ["notif_1", "notif_2"] }),
    });

    expect(response.status).toBe(200);
    expect(provider.markAsReadBatch).toHaveBeenCalledWith(
      ["notif_1", "notif_2"],
      "user_alpha",
      "org_alpha",
    );
    await expect(readJson(response)).resolves.toEqual({ count: 2 });
  });

  it("marks all notifications as read", async () => {
    const { provider } = mockDirectProvider({
      markAllAsRead: vi.fn().mockResolvedValue(5),
    });

    const response = await app.request("/mark-all-read", {
      method: "POST",
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(provider.markAllAsRead).toHaveBeenCalledWith("user_alpha", "org_alpha");
    await expect(readJson(response)).resolves.toEqual({ count: 5 });
  });

  it("updates notification settings through the provider preference service", async () => {
    const update = {
      userId: "user_alpha",
      tenantId: "org_alpha",
      channel: "email",
      enabled: true,
      frequency: "immediate",
      disabledCategories: ["workspace.invitation"],
      updatedAt: "2026-04-29T01:00:00.000Z",
    };
    const { provider } = mockDirectProvider({
      getPreferences: vi.fn().mockResolvedValue([
        {
          userId: "user_alpha",
          tenantId: "org_alpha",
          channel: "email",
          enabled: true,
          frequency: "immediate",
          disabledCategories: [],
        },
      ]),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
    });
    buildNotificationPreferenceUpdateMock.mockReturnValue(update);

    const response = await app.request("/settings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        type: "workspace.invitation",
        channel: "email",
        enabled: false,
      }),
    });

    expect(response.status).toBe(200);
    expect(buildNotificationPreferenceUpdateMock).toHaveBeenCalledWith({
      userId: "user_alpha",
      tenantId: "org_alpha",
      preferences: [
        {
          userId: "user_alpha",
          tenantId: "org_alpha",
          channel: "email",
          enabled: true,
          frequency: "immediate",
          disabledCategories: [],
        },
      ],
      type: "workspace.invitation",
      channel: "email",
      enabled: false,
    });
    expect(provider.updatePreferences).toHaveBeenCalledWith("user_alpha", [update], "org_alpha");
    await expect(readJson(response)).resolves.toEqual({
      ok: true,
      preference: update,
    });
  });

  it("documents notification response bodies in OpenAPI", async () => {
    const contractApp = new OpenAPIHono();
    contractApp.doc("/openapi.json", {
      openapi: "3.0.3",
      info: { title: "Notifications contract test", version: "0.0.0" },
    });
    const { notificationRoutes } = await import("../routes/notifications/index.js");
    contractApp.route("/", notificationRoutes);

    const response = await contractApp.request("/openapi.json");
    const spec = (await response.json()) as {
      paths: Record<
        string,
        {
          get?: {
            responses?: Record<
              string,
              { content?: { "application/json"?: { schema?: Record<string, unknown> } } }
            >;
          };
          post?: {
            responses?: Record<
              string,
              { content?: { "application/json"?: { schema?: Record<string, unknown> } } }
            >;
          };
        }
      >;
    };

    expect(
      spec.paths["/"]?.get?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: {
        items: { type: "array" },
        total: { type: "integer" },
        unreadCount: { type: "integer" },
      },
      required: ["items", "total", "unreadCount"],
      type: "object",
    });
    expect(
      spec.paths["/settings"]?.get?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: {
        runtime: {
          properties: {
            mode: {
              enum: expect.arrayContaining(["self_hosted", "preview"]),
            },
          },
          type: "object",
        },
        channels: { type: "array" },
        preferenceSource: { type: "string" },
        preferences: { type: "array" },
        sections: { type: "array" },
        unreadCount: { type: "integer" },
      },
      required: expect.arrayContaining(["runtime", "channels", "preferences", "unreadCount"]),
      type: "object",
    });
    expect(
      spec.paths["/unread-count"]?.get?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: { count: { type: "integer" } },
      required: ["count"],
      type: "object",
    });
    expect(
      spec.paths["/mark-read"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: { count: { type: "integer" } },
      required: ["count"],
      type: "object",
    });
    expect(
      spec.paths["/mark-all-read"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: { count: { type: "integer" } },
      required: ["count"],
      type: "object",
    });
    expect(
      spec.paths["/settings"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: {
        ok: { type: "boolean" },
        preference: { type: "object" },
      },
      required: ["ok", "preference"],
      type: "object",
    });
  });
});
