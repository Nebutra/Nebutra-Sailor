// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider, useSidebar } from "../sidebar-context";

function setCookie(value: string) {
  // Reset all cookies, then set just our cookie.
  const existing = document.cookie.split(";").map((c) => c.trim());
  for (const c of existing) {
    const [k] = c.split("=");
    if (k) document.cookie = `${k}=; path=/; max-age=0`;
  }
  if (value) document.cookie = value;
}

describe("SidebarProvider / useSidebar", () => {
  beforeEach(() => {
    setCookie("");
  });

  afterEach(() => {
    cleanup();
    setCookie("");
  });

  it("defaults to expanded (collapsed=false) when no cookie present", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
  });

  it("reads initial collapsed state from cookie nebutra-sidebar-collapsed=1", () => {
    setCookie("nebutra-sidebar-collapsed=1; path=/");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(true);
  });

  it("toggle flips state and writes cookie", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(true);
    expect(document.cookie).toContain("nebutra-sidebar-collapsed=1");

    act(() => {
      result.current.toggle();
    });

    expect(result.current.collapsed).toBe(false);
    expect(document.cookie).toContain("nebutra-sidebar-collapsed=0");
  });

  it("setCollapsed sets explicit value and writes cookie", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setCollapsed(true);
    });
    expect(result.current.collapsed).toBe(true);
    expect(document.cookie).toContain("nebutra-sidebar-collapsed=1");
  });

  it("Cmd+B / Ctrl+B keyboard shortcut toggles collapsed state", () => {
    function Probe() {
      const { collapsed } = useSidebar();
      return <span data-testid="state">{collapsed ? "collapsed" : "expanded"}</span>;
    }

    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("state").textContent).toBe("expanded");

    act(() => {
      fireEvent.keyDown(window, { key: "b", metaKey: true });
    });
    expect(screen.getByTestId("state").textContent).toBe("collapsed");

    act(() => {
      fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    });
    expect(screen.getByTestId("state").textContent).toBe("expanded");
  });

  it("ignores plain 'b' key (no modifier)", () => {
    function Probe() {
      const { collapsed } = useSidebar();
      return <span data-testid="state">{collapsed ? "collapsed" : "expanded"}</span>;
    }

    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );

    act(() => {
      fireEvent.keyDown(window, { key: "b" });
    });
    expect(screen.getByTestId("state").textContent).toBe("expanded");
  });

  it("useSidebar throws helpful error when used outside provider", () => {
    // Suppress console.error for the expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSidebar())).toThrow(/SidebarProvider/);
    spy.mockRestore();
  });
});
