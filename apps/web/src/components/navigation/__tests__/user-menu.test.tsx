// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@nebutra/auth/client", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
  useLocale: () => "en",
}));

vi.mock("@nebutra/tokens", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

const routerPushMock = vi.fn();
vi.mock("@nebutra/i18n/routing", () => ({
  useRouter: () => ({ replace: vi.fn(), push: routerPushMock }),
  usePathname: () => "/workspace",
}));

const openFeedbackMock = vi.fn();
vi.mock("@/components/feedback/feedback-dialog-provider", () => ({
  useFeedbackDialog: () => ({ openDialog: openFeedbackMock }),
}));

const openDialogMock = vi.fn();
vi.mock("@/components/account/account-dialog", () => ({
  useAccountDialog: () => ({
    open: false,
    activeTab: "profile" as const,
    openDialog: openDialogMock,
    closeDialog: vi.fn(),
    setOpen: vi.fn(),
    setActiveTab: vi.fn(),
  }),
}));

import { UserMenu } from "../user-menu";

function withUser(user: { name?: string; email?: string; imageUrl?: string } | null) {
  useAuthMock.mockReturnValue({
    isSignedIn: !!user,
    user,
    signOut: signOutMock,
  });
}

describe("UserMenu", () => {
  beforeEach(() => {
    signOutMock.mockClear();
    useAuthMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders avatar image when imageUrl is provided", () => {
    withUser({ name: "Alice", email: "alice@example.com", imageUrl: "https://x/y.png" });
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: /userMenu\.ariaLabel/ });
    expect(trigger).toBeTruthy();
    const img = trigger.querySelector("img");
    expect(img).not.toBeNull();
    expect(decodeURIComponent(img?.getAttribute("src") ?? "")).toContain("https://x/y.png");
  });

  it("falls back to a DiceBear avatar (not initials) when no imageUrl is set", () => {
    withUser({ name: "Bob Carter", email: "bob@example.com" });
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: /userMenu\.ariaLabel/ });
    const img = trigger.querySelector("img");
    expect(img).not.toBeNull();
    // Locally-generated DiceBear SVG data URI — never letter initials.
    expect(img?.getAttribute("src") ?? "").toMatch(/^data:image\/svg\+xml/);
    expect(trigger.textContent).not.toMatch(/BC/);
  });

  it("opens the dropdown menu on click and shows name + email", () => {
    withUser({ name: "Alice", email: "alice@example.com" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /userMenu\.ariaLabel/ }));
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("alice@example.com")).toBeTruthy();
  });

  it("renders Profile, Settings, and Sign out menu items", () => {
    withUser({ name: "Alice", email: "alice@example.com" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /userMenu\.ariaLabel/ }));
    expect(screen.getByRole("menuitem", { name: /userMenu\.profile/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /userMenu\.settings/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /userMenu\.signOut/ })).toBeTruthy();
  });

  it("navigates to the settings page when Settings is clicked", () => {
    withUser({ name: "Alice", email: "alice@example.com" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /userMenu\.ariaLabel/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /userMenu\.settings/ }));
    expect(routerPushMock).toHaveBeenCalledWith("/settings");
  });

  it("renders the Theme submenu trigger with three theme choices when expanded", () => {
    withUser({ name: "Alice", email: "alice@example.com" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /userMenu\.ariaLabel/ }));
    const themeTrigger = screen.getByRole("menuitem", { name: /userMenu\.theme/ });
    fireEvent.click(themeTrigger);
    expect(screen.getByRole("menuitemradio", { name: /theme\.light/ })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /theme\.dark/ })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /theme\.system/ })).toBeTruthy();
  });

  it("invokes signOut when Sign out is clicked", () => {
    withUser({ name: "Alice", email: "alice@example.com" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /userMenu\.ariaLabel/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /userMenu\.signOut/ }));
    expect(signOutMock).toHaveBeenCalled();
  });

  it("renders nothing when not signed in", () => {
    withUser(null);
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });
});
