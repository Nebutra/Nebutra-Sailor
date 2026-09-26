// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
