// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Scope } from "@/lib/permissions";

// jsdom polyfills — cmdk uses ResizeObserver and scrollIntoView internally.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ── Mocks ──────────────────────────────────────────────────────────────────

const setThemeMock = vi.fn();
const signOutMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock("@nebutra/tokens", () => ({
  useTheme: () => ({ theme: "system", setTheme: setThemeMock }),
}));

vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => ({ signOut: signOutMock }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

let canFn: (scope: Scope) => boolean = () => true;

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => ({
    role: "admin" as const,
    isLoading: false,
    can: (scope: Scope) => canFn(scope),
    canAll: (scopes: Scope[]) => scopes.every((s) => canFn(s)),
    canAny: (scopes: Scope[]) => scopes.some((s) => canFn(s)),
  }),
}));

const i18n: Record<string, string> = {
  "commandPalette.placeholder": "Type a command…",
  "commandPalette.empty": "No results.",
  "commandPalette.ariaLabel": "Command palette",
  "commandPalette.sections.navigation": "Navigation",
  "commandPalette.sections.actions": "Actions",
  "commandPalette.sections.settings": "Settings",
  "commandPalette.sections.account": "Account",
  "commandPalette.sections.admin": "Admin",
  "commandPalette.commands.nav.home": "Home",
  "commandPalette.commands.nav.settings": "Settings",
  "commandPalette.commands.nav.billing": "Billing",
  "commandPalette.commands.nav.team": "Team",
  "commandPalette.commands.nav.apiKeys": "API Keys",
  "commandPalette.commands.nav.notifications": "Notifications",
  "commandPalette.commands.nav.auditLog": "Audit Log",
  "commandPalette.commands.nav.webhooks": "Webhooks",
  "commandPalette.commands.nav.admin": "Admin",
  "commandPalette.commands.action.inviteMember": "Invite team member",
  "commandPalette.commands.action.createApiKey": "Create API key",
  "commandPalette.commands.action.switchOrganization": "Switch organization",
  "commandPalette.commands.settings.themeLight": "Switch to light theme",
  "commandPalette.commands.settings.themeDark": "Switch to dark theme",
  "commandPalette.commands.settings.themeSystem": "Use system theme",
  "commandPalette.commands.account.signOut": "Sign out",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return i18n[fullKey] ?? fullKey;
  },
}));

import { CommandPalette } from "../command-palette";
import { CommandPaletteProvider, useCommandPalette } from "../command-palette-provider";

// ── Test harness ───────────────────────────────────────────────────────────

function OpenButton() {
  const { setOpen } = useCommandPalette();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      open-palette
    </button>
  );
}

function Harness({ onNavigate }: { onNavigate?: (href: string) => void }) {
  return (
    <CommandPaletteProvider>
      <OpenButton />
      <CommandPalette onNavigate={onNavigate} />
    </CommandPaletteProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CommandPalette", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    signOutMock.mockReset();
    routerPushMock.mockReset();
    canFn = () => true;
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render when closed", () => {
    render(<Harness />);
    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
  });

  it("opens on cmd+K keyboard shortcut", async () => {
    render(<Harness />);
    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { metaKey: true, key: "k", cancelable: true }),
      );
    });

    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a command…")).toBeInTheDocument();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    });

    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
  });

  it("renders all sections when fully permitted", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));

    // cmdk renders group headings inside [cmdk-group-heading] elements.
    const headings = Array.from(document.querySelectorAll("[cmdk-group-heading]")).map(
      (el) => el.textContent,
    );
    expect(headings).toEqual(
      expect.arrayContaining(["Navigation", "Actions", "Settings", "Account", "Admin"]),
    );
  });

  it("filters commands by search input", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));

    const input = screen.getByPlaceholderText("Type a command…");
    await user.type(input, "billing");

    // "Billing" command is visible
    expect(screen.getByText("Billing")).toBeInTheDocument();
    // Unrelated commands like "Sign out" should be hidden by cmdk filter
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });

  it("invokes navigate handler when item is selected via Enter", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Harness onNavigate={onNavigate} />);

    await user.click(screen.getByText("open-palette"));

    const input = screen.getByPlaceholderText("Type a command…");
    await user.type(input, "home");
    await user.keyboard("{Enter}");

    expect(onNavigate).toHaveBeenCalledWith("/");
    // Closes after selection
    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
  });

  it("invokes setTheme when a theme command is selected", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));

    const input = screen.getByPlaceholderText("Type a command…");
    await user.type(input, "dark theme");
    await user.keyboard("{Enter}");

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("hides admin command when admin:access is missing", async () => {
    canFn = (scope) => scope !== "admin:access" && scope !== "audit_log:read";
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));

    // "Admin" section heading should not render (no items)
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    // The "Audit Log" command should also be hidden
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
    // But Home (no permission requirement) is still visible
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("shows empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("open-palette"));

    const input = screen.getByPlaceholderText("Type a command…");
    await user.type(input, "zzznomatchxxx");

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });
});
