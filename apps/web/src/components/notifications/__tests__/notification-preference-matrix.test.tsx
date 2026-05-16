import type {
  NotificationPreferenceSection,
  NotificationRuntimeStatus,
} from "@nebutra/notifications";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationPreferenceMatrix } from "../notification-preference-matrix";

vi.mock("@/app/[locale]/(app)/settings/notifications/actions", () => ({
  updateNotificationPreference: vi.fn(),
}));

const runtime = {
  provider: "novu",
  providerLabel: "Novu",
  mode: "managed",
  canManagePreferences: true,
  canViewInbox: true,
  canMarkInboxRead: true,
  summary: "Managed notification delivery is active.",
  missing: [],
} satisfies NotificationRuntimeStatus;

const sections: NotificationPreferenceSection[] = [
  {
    id: "billing",
    title: "Billing",
    description: "Billing signals",
    rows: [
      {
        id: "billing.invoice",
        label: "Billing",
        description: "Invoices and subscription changes",
        groupId: "billing",
        cells: [
          {
            channel: "in_app",
            channelLabel: "Inbox",
            enabled: true,
            editable: true,
            supported: true,
          },
          {
            channel: "email",
            channelLabel: "Email",
            enabled: false,
            editable: true,
            supported: true,
          },
          {
            channel: "push",
            channelLabel: "Push",
            enabled: false,
            editable: false,
            supported: false,
            reason: "Push is not configured.",
          },
        ],
      },
    ],
  },
];

describe("NotificationPreferenceMatrix", () => {
  it("renders preference cells with explicit toggle labels and pressed state", () => {
    const html = renderToStaticMarkup(
      <NotificationPreferenceMatrix
        locale="en"
        runtime={runtime}
        preferenceSource="provider"
        sections={sections}
      />,
    );

    expect(html).toContain('aria-label="Turn off Billing via Inbox"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Turn on Billing via Email"');
    expect(html).toContain("Push is not configured.");
  });
});
