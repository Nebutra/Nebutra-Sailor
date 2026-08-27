// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  CommandPaletteProvider,
  isCommandPaletteShortcut,
  useCommandPalette,
} from "../command-palette-provider";

afterEach(() => {
  cleanup();
});

function dispatchKey(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { ...init, cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("isCommandPaletteShortcut", () => {
  it("matches cmd+K on macOS", () => {
    const event = new KeyboardEvent("keydown", { metaKey: true, key: "k" });
    expect(isCommandPaletteShortcut(event)).toBe(true);
  });

  it("matches ctrl+K on Windows/Linux", () => {
    const event = new KeyboardEvent("keydown", { ctrlKey: true, key: "k" });
    expect(isCommandPaletteShortcut(event)).toBe(true);
  });

  it("matches uppercase K", () => {
    const event = new KeyboardEvent("keydown", { metaKey: true, key: "K" });
    expect(isCommandPaletteShortcut(event)).toBe(true);
  });

  it("does not match plain K", () => {
    const event = new KeyboardEvent("keydown", { key: "k" });
    expect(isCommandPaletteShortcut(event)).toBe(false);
  });
});

describe("CommandPaletteProvider", () => {
  it("opens on cmd+K and toggles closed on second press", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    );
    const { result } = renderHook(() => useCommandPalette(), { wrapper });
    expect(result.current.open).toBe(false);

    act(() => {
      dispatchKey({ metaKey: true, key: "k" });
    });
    expect(result.current.open).toBe(true);

    act(() => {
      dispatchKey({ metaKey: true, key: "k" });
    });
    expect(result.current.open).toBe(false);
  });

  it("setOpen and toggle update state immutably", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider disableShortcut>{children}</CommandPaletteProvider>
    );
    const { result } = renderHook(() => useCommandPalette(), { wrapper });

    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("registerCommand adds and unregisterCommand removes a dynamic command", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider disableShortcut>{children}</CommandPaletteProvider>
    );
    const { result } = renderHook(() => useCommandPalette(), { wrapper });

    expect(result.current.dynamicCommands).toHaveLength(0);

    const Icon = () => null;
    const cmd = {
      id: "dynamic.test",
      titleKey: "test",
      section: "actions" as const,
      // biome-ignore lint/suspicious/noExplicitAny: test stub
      icon: Icon as any,
      handler: () => {},
    };

    act(() => {
      result.current.registerCommand(cmd);
    });
    expect(result.current.dynamicCommands).toHaveLength(1);
    expect(result.current.dynamicCommands[0]?.id).toBe("dynamic.test");

    act(() => {
      result.current.unregisterCommand("dynamic.test");
    });
    expect(result.current.dynamicCommands).toHaveLength(0);
  });

  it("throws when useCommandPalette is used outside provider", () => {
    const consoleError = console.error;
    // Suppress React error boundary warning
    console.error = () => {};
    try {
      expect(() => {
        renderHook(() => useCommandPalette());
      }).toThrow(/within a CommandPaletteProvider/);
    } finally {
      console.error = consoleError;
    }
  });

  it("disableShortcut prevents the global keydown listener", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider disableShortcut>{children}</CommandPaletteProvider>
    );
    const { result } = renderHook(() => useCommandPalette(), { wrapper });

    act(() => {
      dispatchKey({ metaKey: true, key: "k" });
    });
    expect(result.current.open).toBe(false);
  });

  it("renders children", () => {
    const { getByText } = render(
      <CommandPaletteProvider disableShortcut>
        <span>palette-host</span>
      </CommandPaletteProvider>,
    );
    expect(getByText("palette-host")).toBeInTheDocument();
  });
});
