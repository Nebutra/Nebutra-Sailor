// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authClient = vi.hoisted(() => ({
  getConfiguredAuthProvider: vi.fn(),
  isAuthFeatureEnabledSync: vi.fn(),
  useUser: vi.fn(),
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("@nebutra/auth/client", () => ({
  getConfiguredAuthProvider: authClient.getConfiguredAuthProvider,
  isAuthFeatureEnabledSync: authClient.isAuthFeatureEnabledSync,
  useUser: authClient.useUser,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("../change-password-form", () => ({
  ChangePasswordForm: () => <div data-testid="change-password" />,
}));

vi.mock("../connected-accounts-block", () => ({
  ConnectedAccountsBlock: () => <div data-testid="connected-accounts" />,
}));

vi.mock("../delete-account-form", () => ({
  DeleteAccountForm: ({ children }: { children?: ReactNode }) => (
    <div data-testid="delete-account">{children}</div>
  ),
}));

vi.mock("../passkeys-block", () => ({
  PasskeysBlock: () => <div data-testid="passkeys" />,
}));

vi.mock("../two-factor-block", () => ({
  TwoFactorBlock: () => <div data-testid="two-factor" />,
}));

vi.mock("../active-sessions-block", () => ({
  ActiveSessionsBlock: ({ sessions }: { sessions: unknown[] }) => (
    <pre data-testid="active-sessions">{JSON.stringify(sessions)}</pre>
  ),
}));

import { SecuritySettingsClient } from "../security-settings-client";

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("SecuritySettingsClient", () => {
  beforeEach(() => {
    authClient.getConfiguredAuthProvider.mockReturnValue("better-auth");
    authClient.isAuthFeatureEnabledSync.mockReturnValue(true);
    authClient.useUser.mockReturnValue({
      isLoaded: true,
      user: { email: "ada@example.com" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads device sessions from the unified endpoint instead of legacy session routes", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/list-accounts") {
        return Promise.resolve(jsonResponse([{ id: "account_1", providerId: "credential" }]));
      }

      if (url === "/api/auth/device-sessions") {
        return Promise.resolve(
          jsonResponse([
            {
              id: "desktop_1",
              kind: "desktop",
              label: "Nebutra Foundry desktop",
              createdAt: "2026-06-02T10:00:00.000Z",
              updatedAt: "2026-06-03T10:00:00.000Z",
              lastActiveAt: "2026-06-05T10:00:00.000Z",
              expiresAt: "2026-07-02T10:00:00.000Z",
              ipAddress: "203.0.113.11",
              userAgent: "Nebutra Foundry/1.0 macOS",
              isCurrent: false,
              canRevoke: true,
            },
          ]),
        );
      }

      if (url === "/api/auth/two-factor-status") {
        return Promise.resolve(jsonResponse({ enabled: false }));
      }

      return Promise.resolve(jsonResponse({ error: `Unexpected ${url}` }, { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByTestId("active-sessions")).toHaveTextContent("Nebutra Foundry desktop");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/device-sessions", {
      credentials: "include",
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/list-sessions", expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith("/api/auth/current-session", expect.anything());
  });
});
