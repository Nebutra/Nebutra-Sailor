import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOrgMock = vi.fn();
const getNotificationProviderMock = vi.fn();
const resolveNotificationRuntimeStatusMock = vi.fn();
const getNotificationCatalogEntryMock = vi.fn();
const buildNotificationPreferenceUpdateMock = vi.fn();
const revalidatePathMock = vi.fn();
const headersMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/auth", () => ({
  requireOrg: requireOrgMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@nebutra/notifications", () => ({
  buildNotificationPreferenceUpdate: buildNotificationPreferenceUpdateMock,
  getNotificationCatalogEntry: getNotificationCatalogEntryMock,
  getNotificationProvider: getNotificationProviderMock,
  resolveNotificationRuntimeStatus: resolveNotificationRuntimeStatusMock,
}));

async function loadActions() {
  return import("@/app/[locale]/(app)/settings/notifications/actions");
}

function createFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

async function expectRedirect(promise: Promise<never>, path: string) {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${path}`);
}

describe("notification settings actions", () => {
  beforeEach(() => {
    requireOrgMock.mockReset();
    getNotificationProviderMock.mockReset();
    resolveNotificationRuntimeStatusMock.mockReset();
    getNotificationCatalogEntryMock.mockReset();
    buildNotificationPreferenceUpdateMock.mockReset();
    revalidatePathMock.mockReset();
    headersMock.mockReset();
    redirectMock.mockClear();

    requireOrgMock.mockResolvedValue({ userId: "user_123", orgId: "org_456" });
    headersMock.mockResolvedValue(new Headers());
    resolveNotificationRuntimeStatusMock.mockReturnValue({
      provider: "novu",
      providerLabel: "Novu",
      mode: "managed",
      canManagePreferences: true,
      canViewInbox: true,
      canMarkInboxRead: true,
      summary: "managed",
      missing: [],
    });
    getNotificationCatalogEntryMock.mockReturnValue({
      id: "workspace.invitation",
      label: "Workspace invitations",
    });
  });

  describe("updateNotificationPreference", () => {
    it("redirects with an error when the form payload is invalid", async () => {
      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.invitation",
            channel: "fax",
            enabled: "true",
          }),
        ),
        "/en/settings/notifications?error=Invalid+notification+preference+request.",
      );

      expect(getNotificationProviderMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("redirects with an error when the category is unknown", async () => {
      getNotificationCatalogEntryMock.mockReturnValue(null);
      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.unknown",
            channel: "email",
            enabled: "true",
          }),
        ),
        "/en/settings/notifications?error=Unknown+notification+category.",
      );

      expect(getNotificationProviderMock).not.toHaveBeenCalled();
    });

    it("redirects with an error when notifications are unavailable", async () => {
      getNotificationProviderMock.mockRejectedValue(new Error("not configured"));
      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.invitation",
            channel: "email",
            enabled: "true",
          }),
        ),
        "/en/settings/notifications?error=Notifications+are+not+configured+in+this+environment+yet.",
      );
    });

    it("redirects with the runtime reason when preferences are read-only", async () => {
      getNotificationProviderMock.mockResolvedValue({ name: "direct" });
      resolveNotificationRuntimeStatusMock.mockReturnValue({
        provider: "direct",
        providerLabel: "Direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        summary: "preview",
        reason: "Connect durable adapters first.",
        missing: ["Persistent preference storage"],
      });

      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.invitation",
            channel: "email",
            enabled: "false",
          }),
        ),
        "/en/settings/notifications?error=Connect+durable+adapters+first.",
      );
    });

    it("updates preferences, revalidates the page, and redirects with a notice", async () => {
      const provider = {
        name: "novu",
        getPreferences: vi.fn().mockResolvedValue([{ channel: "email", enabled: true }]),
        updatePreferences: vi.fn().mockResolvedValue(undefined),
      };

      getNotificationProviderMock.mockResolvedValue(provider);
      buildNotificationPreferenceUpdateMock.mockReturnValue({
        channel: "email",
        enabled: true,
        frequency: "immediate",
      });

      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.invitation",
            channel: "email",
            enabled: "true",
          }),
        ),
        "/en/settings/notifications?notice=Workspace+invitations+email+delivery+enabled.",
      );

      expect(provider.getPreferences).toHaveBeenCalledWith("user_123", "org_456");
      expect(buildNotificationPreferenceUpdateMock).toHaveBeenCalledWith({
        userId: "user_123",
        tenantId: "org_456",
        preferences: [{ channel: "email", enabled: true }],
        type: "workspace.invitation",
        channel: "email",
        enabled: true,
      });
      expect(provider.updatePreferences).toHaveBeenCalledWith(
        "user_123",
        [{ channel: "email", enabled: true, frequency: "immediate" }],
        "org_456",
      );
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/settings/notifications");
    });

    it("redirects with a stable error when provider updates fail", async () => {
      const provider = {
        name: "novu",
        getPreferences: vi.fn().mockResolvedValue([]),
        updatePreferences: vi.fn().mockRejectedValue(new Error("provider failed")),
      };

      getNotificationProviderMock.mockResolvedValue(provider);
      buildNotificationPreferenceUpdateMock.mockReturnValue({
        channel: "push",
        enabled: false,
        frequency: "immediate",
      });

      const { updateNotificationPreference } = await loadActions();

      await expectRedirect(
        updateNotificationPreference(
          createFormData({
            locale: "en",
            type: "workspace.invitation",
            channel: "push",
            enabled: "false",
          }),
        ),
        "/en/settings/notifications?error=Failed+to+update+the+notification+preference.+Try+again+after+the+provider+is+wired.",
      );

      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });

  describe("markNotificationRead", () => {
    it("redirects with an error when the inbox request is invalid", async () => {
      const { markNotificationRead } = await loadActions();

      await expectRedirect(
        markNotificationRead(
          createFormData({
            locale: "en",
          }),
        ),
        "/en/settings/notifications?error=Invalid+notification+inbox+request.",
      );

      expect(getNotificationProviderMock).not.toHaveBeenCalled();
    });

    it("redirects with the runtime reason when inbox state is read-only", async () => {
      getNotificationProviderMock.mockResolvedValue({ name: "direct" });
      resolveNotificationRuntimeStatusMock.mockReturnValue({
        provider: "direct",
        providerLabel: "Direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        summary: "preview",
        reason: "Inbox storage is not durable yet.",
        missing: ["Persistent in-app inbox storage"],
      });

      const { markNotificationRead } = await loadActions();

      await expectRedirect(
        markNotificationRead(
          createFormData({
            locale: "en",
            notificationId: "notif_1",
          }),
        ),
        "/en/settings/notifications?error=Inbox+storage+is+not+durable+yet.",
      );
    });

    it("marks the notification as read, revalidates, and redirects with a notice", async () => {
      const provider = {
        name: "novu",
        markAsRead: vi.fn().mockResolvedValue(undefined),
      };

      getNotificationProviderMock.mockResolvedValue(provider);

      const { markNotificationRead } = await loadActions();

      await expectRedirect(
        markNotificationRead(
          createFormData({
            locale: "en",
            notificationId: "notif_1",
          }),
        ),
        "/en/settings/notifications?notice=Notification+marked+as+read.",
      );

      expect(provider.markAsRead).toHaveBeenCalledWith("notif_1", "user_123", "org_456");
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/settings/notifications");
    });

    it("returns to the shell page when a same-locale return path is provided", async () => {
      const provider = {
        name: "novu",
        markAsRead: vi.fn().mockResolvedValue(undefined),
      };

      getNotificationProviderMock.mockResolvedValue(provider);

      const { markNotificationRead } = await loadActions();

      await expectRedirect(
        markNotificationRead(
          createFormData({
            locale: "en",
            notificationId: "notif_1",
            returnTo: "/en/dashboard",
          }),
        ),
        "/en/dashboard",
      );

      expect(provider.markAsRead).toHaveBeenCalledWith("notif_1", "user_123", "org_456");
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/settings/notifications");
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard");
    });

    it("redirects with a stable error when inbox updates fail", async () => {
      const provider = {
        name: "novu",
        markAsRead: vi.fn().mockRejectedValue(new Error("provider failed")),
      };

      getNotificationProviderMock.mockResolvedValue(provider);

      const { markNotificationRead } = await loadActions();

      await expectRedirect(
        markNotificationRead(
          createFormData({
            locale: "en",
            notificationId: "notif_1",
          }),
        ),
        "/en/settings/notifications?error=Failed+to+update+inbox+state.+Try+again+after+the+provider+is+wired.",
      );

      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });

  describe("markAllNotificationsRead", () => {
    it("delegates mark-all inbox updates to the notification provider", async () => {
      const provider = {
        name: "novu",
        markAllAsRead: vi.fn().mockResolvedValue(2),
      };

      getNotificationProviderMock.mockResolvedValue(provider);

      const { markAllNotificationsRead } = await loadActions();

      await expectRedirect(
        markAllNotificationsRead(
          createFormData({
            locale: "en",
            returnTo: "/en/dashboard",
          }),
        ),
        "/en/dashboard",
      );

      expect(provider.markAllAsRead).toHaveBeenCalledWith("user_123", "org_456");
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/settings/notifications");
      expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard");
    });

    it("redirects with the runtime reason when mark-all is read-only", async () => {
      getNotificationProviderMock.mockResolvedValue({ name: "direct" });
      resolveNotificationRuntimeStatusMock.mockReturnValue({
        provider: "direct",
        providerLabel: "Direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        summary: "preview",
        reason: "Inbox storage is not durable yet.",
        missing: ["Persistent in-app inbox storage"],
      });

      const { markAllNotificationsRead } = await loadActions();

      await expectRedirect(
        markAllNotificationsRead(
          createFormData({
            locale: "en",
          }),
        ),
        "/en/settings/notifications?error=Inbox+storage+is+not+durable+yet.",
      );
    });
  });
});
