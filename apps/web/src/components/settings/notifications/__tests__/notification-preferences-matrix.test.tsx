// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPreferencesMatrix } from "@/components/settings/notifications/notification-preferences-matrix";

const labels: Record<string, string> = {
  "settings.notifications.title": "Notifications",
  "settings.notifications.description": "Choose how Nebutra reaches you.",
  "settings.notifications.actions.resetAll": "Reset to defaults",
  "settings.notifications.status.saving": "Saving…",
  "settings.notifications.status.saved": "Saved",
  "settings.notifications.status.error": "Save failed",
  "settings.notifications.eventTypes.security.label": "Security alerts",
  "settings.notifications.eventTypes.security.description": "Sign-in alerts",
  "settings.notifications.eventTypes.billing.label": "Billing",
  "settings.notifications.eventTypes.billing.description": "Invoices",
  "settings.notifications.eventTypes.invitation.label": "Invitations",
  "settings.notifications.eventTypes.invitation.description": "Org invites",
  "settings.notifications.eventTypes.activity.label": "Team activity",
  "settings.notifications.eventTypes.activity.description": "Members joined",
  "settings.notifications.eventTypes.updates.label": "Product updates",
  "settings.notifications.eventTypes.updates.description": "Release notes",
  "settings.notifications.eventTypes.marketing.label": "Marketing",
  "settings.notifications.eventTypes.marketing.description": "Newsletter",
  "settings.notifications.channels.in_app.label": "In-app",
  "settings.notifications.channels.email.label": "Email",
  "settings.notifications.channels.push.label": "Push",
  "settings.notifications.channels.sms.label": "SMS",
};

const t = (key: string) => labels[key] ?? key;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NotificationPreferencesMatrix", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  function mockGetSuccess(preferences: Record<string, Record<string, boolean>> = {}) {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { preferences, readOnly: false },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  }

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { preferences: {}, readOnly: false },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  it("renders a loading skeleton while fetching initial preferences", async () => {
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    expect(screen.getByTestId("notification-preferences-loading")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId("notification-preferences-loading")).not.toBeInTheDocument(),
    );
  });

  it("renders all 6 event-type rows after load", async () => {
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Security alerts")).toBeInTheDocument());
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Invitations")).toBeInTheDocument();
    expect(screen.getByText("Team activity")).toBeInTheDocument();
    expect(screen.getByText("Product updates")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });

  it("hides push and sms columns when capabilities are missing", async () => {
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("notification-cell-account.security-in_app")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("notification-cell-account.security-email")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-cell-account.security-push")).not.toBeInTheDocument();
    expect(screen.queryByTestId("notification-cell-account.security-sms")).not.toBeInTheDocument();
  });

  it("shows push and sms columns when user has those capabilities", async () => {
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: true, phoneVerified: true }}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("notification-cell-account.security-push")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("notification-cell-account.security-sms")).toBeInTheDocument();
  });

  it("toggling a cell sends a PATCH with the correct payload", async () => {
    const user = userEvent.setup();
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Security alerts")).toBeInTheDocument());

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const row = screen.getByTestId("notification-row-account.security");
    const emailCell = within(row).getByTestId("notification-cell-account.security-email");
    await user.click(emailCell);

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const init = patchCall?.[1] as RequestInit;
      const parsed = JSON.parse(init.body as string);
      expect(parsed).toEqual({
        eventType: "account.security",
        channel: "email",
        enabled: false,
      });
    });
  });

  it("reverts the cell state when PATCH fails", async () => {
    const user = userEvent.setup();
    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Security alerts")).toBeInTheDocument());

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: "boom" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const row = screen.getByTestId("notification-row-account.security");
    const emailCell = within(row).getByTestId("notification-cell-account.security-email");

    expect(emailCell.getAttribute("aria-checked")).toBe("true");
    await user.click(emailCell);

    // After failure the cell should revert to true again
    await waitFor(() => expect(emailCell.getAttribute("aria-checked")).toBe("true"));
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });

  it("loads existing preferences from GET and reflects them in the UI", async () => {
    fetchSpy.mockReset();
    mockGetSuccess({
      "product.marketing": { in_app: false, email: false },
    });

    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Marketing")).toBeInTheDocument());

    const row = screen.getByTestId("notification-row-product.marketing");
    const inAppCell = within(row).getByTestId("notification-cell-product.marketing-in_app");
    const emailCell = within(row).getByTestId("notification-cell-product.marketing-email");
    expect(inAppCell.getAttribute("aria-checked")).toBe("false");
    expect(emailCell.getAttribute("aria-checked")).toBe("false");
  });

  it("clicking 'Reset to defaults' wipes all overrides", async () => {
    const user = userEvent.setup();
    fetchSpy.mockReset();
    mockGetSuccess({
      "product.marketing": { email: false },
    });

    render(
      <NotificationPreferencesMatrix
        t={t}
        capabilities={{ hasPushSubscription: false, phoneVerified: false }}
      />,
    );

    await waitFor(() => expect(screen.getByText("Marketing")).toBeInTheDocument());

    const marketingEmail = screen.getByTestId("notification-cell-product.marketing-email");
    expect(marketingEmail.getAttribute("aria-checked")).toBe("false");

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const resetButton = screen.getByRole("button", { name: "Reset to defaults" });
    await user.click(resetButton);

    // After reset, marketing.email should snap back to its default (true per defaults)
    await waitFor(() => expect(marketingEmail.getAttribute("aria-checked")).toBe("true"));
  });
});
