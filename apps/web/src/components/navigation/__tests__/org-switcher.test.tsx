// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "navigation.orgSwitcher.ariaLabel": "Switch organization",
  "navigation.orgSwitcher.current": "Current",
  "navigation.orgSwitcher.empty": "No organizations",
  "navigation.orgSwitcher.selectOrg": "Select organization",
  "navigation.orgSwitcher.create": "Create organization",
  "navigation.orgSwitcher.switching": "Switching...",
  "navigation.orgSwitcher.error": "Could not switch organization. Try again.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

// Mock @nebutra/ui/components — AnimateIn passes children through, Button is a real button.
vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children: ReactNode }) => <div data-animate-in>{children}</div>,
  Button: ({
    children,
    onClick,
    type,
    ...rest
  }: {
    children?: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
  }) => (
    <button type={type ?? "button"} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

const isLoadedRef = { current: true };
const orgRef: { current: { id: string; name: string; slug: string } | null } = {
  current: { id: "org_a", name: "Acme Labs", slug: "acme" },
};
const orgsListRef: { current: Array<{ id: string; name: string; slug: string }> } = {
  current: [
    { id: "org_a", name: "Acme Labs", slug: "acme" },
    { id: "org_b", name: "Beta Co", slug: "beta" },
  ],
};

vi.mock("@nebutra/auth/client", () => ({
  useOrganization: () => ({ organization: orgRef.current, isLoaded: isLoadedRef.current }),
}));

import { OrgSwitcher } from "../org-switcher";

beforeEach(() => {
  refreshMock.mockReset();
  isLoadedRef.current = true;
  orgRef.current = { id: "org_a", name: "Acme Labs", slug: "acme" };
  orgsListRef.current = [
    { id: "org_a", name: "Acme Labs", slug: "acme" },
    { id: "org_b", name: "Beta Co", slug: "beta" },
  ];

  global.fetch = vi.fn((url: string) => {
    if (url === "/api/organizations") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ organizations: orgsListRef.current }),
      } as Response);
    }
    if (url === "/api/organizations/active") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      } as Response);
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("OrgSwitcher", () => {
  it("renders the current organization name on the trigger", () => {
    render(<OrgSwitcher />);
    const trigger = screen.getByRole("button", { name: /Switch organization/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Acme Labs");
  });

  it("opens a dropdown listing the user's organizations on click", async () => {
    const user = userEvent.setup();
    render(<OrgSwitcher />);

    await user.click(screen.getByRole("button", { name: /Switch organization/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
    expect(screen.getByRole("menuitem", { name: /Acme Labs/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: /Beta Co/i })).toBeInTheDocument();
  });

  it("posts to /api/organizations/active and refreshes on row click", async () => {
    const user = userEvent.setup();
    render(<OrgSwitcher />);

    await user.click(screen.getByRole("button", { name: /Switch organization/i }));
    await screen.findByRole("menuitem", { name: /Beta Co/i });
    await user.click(screen.getByRole("menuitem", { name: /Beta Co/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/organizations/active",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ organizationId: "org_b" }),
        }),
      );
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("renders an empty state with a Create organization CTA when no orgs", async () => {
    orgsListRef.current = [];
    orgRef.current = null;

    const user = userEvent.setup();
    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button", { name: /Switch organization/i }));

    expect(await screen.findByText("No organizations")).toBeInTheDocument();
    const createLink = screen.getByRole("link", { name: /Create organization/i });
    expect(createLink).toHaveAttribute("href", "/onboarding");
  });

  it("shows an error message when the switch request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === "/api/organizations") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ organizations: orgsListRef.current }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Org not found." }),
      });
    });

    const user = userEvent.setup();
    render(<OrgSwitcher />);
    await user.click(screen.getByRole("button", { name: /Switch organization/i }));
    await screen.findByRole("menuitem", { name: /Beta Co/i });
    await user.click(screen.getByRole("menuitem", { name: /Beta Co/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Could not switch organization. Try again./,
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("renders nothing while the auth context is still loading", () => {
    isLoadedRef.current = false;
    orgRef.current = null;
    const { container } = render(<OrgSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });
});
