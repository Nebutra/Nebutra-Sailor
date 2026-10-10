// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalePanel } from "./locale-panel";

/**
 * The panel portals to <body>. In place, any ancestor with a stacking context
 * (the router market's backdrop-blurred utility bar) trapped its popover-tier
 * z-index and the page drew over it; the mobile sheet's position: fixed also
 * resolved against that ancestor instead of the viewport.
 */
const copy = {
  triggerAria: "Change language",
  menuAria: "Languages",
  searchPlaceholder: "Search languages…",
  noResults: "No match",
  closeAria: "Close",
};

function renderInsideBlurredBar() {
  return render(
    <div data-testid="bar" style={{ backdropFilter: "blur(4px)" }}>
      <LocalePanel copy={copy} trigger={<span>EN</span>}>
        {(_query, close) => (
          <button type="button" onClick={close}>
            English
          </button>
        )}
      </LocalePanel>
    </div>,
  );
}

describe("LocalePanel", () => {
  it("renders its panel on <body>, outside the trigger's ancestors", () => {
    renderInsideBlurredBar();
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    const panel = screen.getByRole("dialog", { name: "Languages" });
    expect(panel.parentElement).toBe(document.body);
    expect(screen.getByTestId("bar").contains(panel)).toBe(false);
  });

  it("stays open while focus moves into the portalled panel, and closes on Escape", () => {
    renderInsideBlurredBar();
    const trigger = screen.getByRole("button", { name: "Change language" });
    fireEvent.click(trigger);
    const search = screen.getByPlaceholderText("Search languages…");
    act(() => {
      fireEvent.blur(trigger, { relatedTarget: search });
    });
    expect(screen.queryByRole("dialog")).not.toBeNull();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("vertical placement", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function openWithTriggerAt(top: number) {
      Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
      vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect").mockReturnValue({
        top,
        bottom: top + 36,
        left: 600,
        right: 760,
        width: 160,
        height: 36,
        x: 600,
        y: top,
        toJSON: () => ({}),
      } as DOMRect);
      renderInsideBlurredBar();
      fireEvent.click(screen.getByRole("button", { name: "Change language" }));
      return screen.getByRole("dialog", { name: "Languages" });
    }

    it("opens downward from a trigger near the top", () => {
      const panel = openWithTriggerAt(40);
      expect(panel.style.top).toBe("84px");
      expect(panel.style.bottom).toBe("");
    });

    // The footer switcher: opening downward put the list below the fold.
    it("opens upward from a trigger near the bottom of the viewport", () => {
      const panel = openWithTriggerAt(840);
      expect(panel.style.bottom).toBe("68px");
      expect(panel.style.top).toBe("");
      expect(Number.parseInt(panel.style.maxHeight, 10)).toBeGreaterThanOrEqual(320);
    });
  });
});
