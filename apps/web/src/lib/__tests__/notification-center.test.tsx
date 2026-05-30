// @vitest-environment jsdom

import type { NotificationSettingsSnapshot } from "@nebutra/notifications";
import { render, screen } from "@testing-library/react";
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
    render(
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

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Invite accepted")).toBeTruthy();
    expect(screen.getByText("Ada joined the workspace.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open/ }).getAttribute("href")).toBe("/en/team");
    expect(screen.getByText("Mark read")).toBeTruthy();
    expect(screen.getByText("Mark all read")).toBeTruthy();
  });

  it("caps large unread badges and shows degraded inbox state honestly", () => {
    render(
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

    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByText("Persistent inbox storage is not connected.")).toBeTruthy();
    expect(
      screen.getByText(
        "Inbox messages will appear here once a persistent notification backend is connected.",
      ),
    ).toBeTruthy();
    const markAll = screen.getByText("Mark all read");
    expect(markAll.hasAttribute("disabled")).toBe(true);
  });
});
