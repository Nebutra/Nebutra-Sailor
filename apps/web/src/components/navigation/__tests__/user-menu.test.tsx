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
}));

vi.mock("@nebutra/tokens", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
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
    expect(img?.getAttribute("src")).toContain("https://x/y.png");
  });

  it("falls back to initials when no imageUrl is set", () => {
    withUser({ name: "Bob Carter", email: "bob@example.com" });
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: /userMenu\.ariaLabel/ });
    expect(trigger.textContent).toMatch(/BC/);
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
