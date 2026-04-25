import type { NotificationSettingsSnapshot } from "@nebutra/notifications";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "@/components/notifications/notification-center";

vi.mock("@/app/[locale]/(app)/settings/notifications/actions", () => ({
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

function buildSnapshot(
  override: Partial<
    Pick<
      NotificationSettingsSnapshot,
      "runtime" | "inboxItems" | "inboxSource" | "inboxReason" | "unreadCount"
    >
  > = {},
) {
  return {
    runtime: {
      provider: "novu",
      providerLabel: "Novu",
      mode: "managed",
      canManagePreferences: true,
      canViewInbox: true,
      canMarkInboxRead: true,
      summary: "Managed notification delivery is active.",
      missing: [],
    },
    inboxSource: "provider",
    inboxItems: [],
    unreadCount: 0,
    ...override,
  } satisfies Pick<
    NotificationSettingsSnapshot,
    "runtime" | "inboxItems" | "inboxSource" | "inboxReason" | "unreadCount"
  >;
}

describe("NotificationCenter", () => {
  it("renders an unread badge, linked inbox item, and mark-read controls", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        locale="en"
        defaultOpen
        snapshot={buildSnapshot({
          unreadCount: 3,
          inboxItems: [
            {
              id: "notif_1",
              type: "workspace.invitation",
              title: "Invite accepted",
              body: "Ada joined the workspace.",
              href: "/en/team",
              read: false,
              createdAt: "2026-04-25T08:00:00.000Z",
              groupId: "workspace",
            },
          ],
        })}
      />,
    );

    expect(html).toContain(">3</span>");
    expect(html).toContain("Invite accepted");
    expect(html).toContain("Ada joined the workspace.");
    expect(html).toContain('href="/en/team"');
    expect(html).toContain("Mark read");
    expect(html).toContain("Mark all read");
  });

  it("caps large unread badges and shows degraded inbox state honestly", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        locale="en"
        defaultOpen
        snapshot={buildSnapshot({
          inboxSource: "unavailable",
          inboxReason: "Persistent inbox storage is not connected.",
          unreadCount: 120,
          runtime: {
            provider: "direct",
            providerLabel: "Direct",
            mode: "preview",
            canManagePreferences: false,
            canViewInbox: false,
            canMarkInboxRead: false,
            summary: "Preview mode",
            reason: "Persistent inbox storage is not connected.",
            missing: ["Persistent in-app inbox storage"],
          },
        })}
      />,
    );

    expect(html).toContain("99+");
    expect(html).toContain("Persistent inbox storage is not connected.");
    expect(html).toContain(
      "Inbox messages will appear here once a persistent notification backend is connected.",
    );
    expect(html).toContain("disabled=");
  });
});
