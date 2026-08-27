// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "organizations.invitation.title": "You've been invited",
  "organizations.invitation.heading": "You've been invited to join {organizationName}",
  "organizations.invitation.description":
    "Accept the invitation to start collaborating with the team.",
  "organizations.invitation.accept": "Accept",
  "organizations.invitation.accepting": "Accepting...",
  "organizations.invitation.decline": "Decline",
  "organizations.invitation.declining": "Declining...",
  "organizations.invitation.declinedView": "Invitation declined",
  "organizations.invitation.success": "We've let the inviter know.",
  "organizations.invitation.backToDashboard": "Back to dashboard",
  "organizations.invitation.roleLabel": "Role: {role}",
  "organizations.invitation.role.owner": "Owner",
  "organizations.invitation.role.admin": "Admin",
  "organizations.invitation.role.member": "Member",
  "organizations.invitation.role.viewer": "Viewer",
  "auth.errors.unknown": "Something went wrong. Please try again.",
  "auth.errors.networkError": "Network error. Check your connection and try again.",
};

function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? `{${key}}`));
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, vars?: Record<string, unknown>) => {
    const fullKey = `${namespace}.${key}`;
    const template = messages[fullKey];
    return template ? interpolate(template, vars) : fullKey;
  },
}));

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

import { OrganizationInvitationModal } from "../organization-invitation-modal";

describe("OrganizationInvitationModal", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the organization name, role and accept/decline buttons", () => {
    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Acme Labs/);
    expect(screen.getByText(/Role: Member/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("calls the accept endpoint and navigates on success", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, organizationId: "org_alpha" }),
    });

    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/invitations/inv_1/accept",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("calls the decline endpoint and shows the declined view", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/invitations/inv_1/decline",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Invitation declined")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Back to dashboard" })).toBeInTheDocument();
    });
  });

  it("surfaces a localized error message when accept fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: "UNKNOWN" }),
    });

    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong. Please try again.",
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("surfaces a localized error message when decline fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError("fetch failed"));

    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Network error/);
    });
  });

  it("disables both buttons while a request is in flight", async () => {
    let resolveFetch: ((value: unknown) => void) | null = null;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <OrganizationInvitationModal
        invitationId="inv_1"
        organizationName="Acme Labs"
        roleLabel="member"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Accepting..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
    });

    if (resolveFetch) {
      (resolveFetch as (value: unknown) => void)({ ok: true, json: async () => ({ ok: true }) });
    }
  });
});
