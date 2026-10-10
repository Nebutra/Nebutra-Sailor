import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { interaction } from "../../tokens/components/interaction";
import { Button } from "../button";
import { Spinner } from "../spinner";

/**
 * Spinner and Button `loading` share the interaction.pending contract: the
 * glyph waits `showDelayMs` before painting and, once painted, stays for
 * `minVisibleMs`. Interaction semantics (disabled, aria-busy, role=status) are
 * never delayed — only the paint is.
 */

const { showDelayMs, minVisibleMs } = interaction.pending;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("Spinner pending visibility", () => {
  it("exposes its status immediately but paints only after the show delay", () => {
    render(<Spinner label="Saving" />);
    const status = screen.getByRole("status", { name: "Saving" });

    expect(status).not.toHaveAttribute("data-visible");
    expect(status.className).toContain("opacity-0");

    advance(showDelayMs);

    expect(status).toHaveAttribute("data-visible");
    expect(status.className).toContain("opacity-100");
  });

  it("paints on the first frame when immediate", () => {
    render(<Spinner label="Saving" immediate />);
    expect(screen.getByRole("status", { name: "Saving" })).toHaveAttribute("data-visible");
  });
});

describe("Button loading pending visibility", () => {
  const spinnerIn = (button: HTMLElement) =>
    button.querySelector("span[aria-hidden='true'].rounded-full");

  it("disables at once but withholds the spinner until the wait is noticeable", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(spinnerIn(button)).toBeNull();

    advance(showDelayMs);
    expect(spinnerIn(button)).not.toBeNull();
  });

  it("never flashes a spinner for work that finishes inside the delay", () => {
    const { rerender } = render(<Button loading>Save</Button>);
    advance(showDelayMs - 50);
    rerender(<Button loading={false}>Save</Button>);
    advance(minVisibleMs + showDelayMs);

    const button = screen.getByRole("button", { name: "Save" });
    expect(spinnerIn(button)).toBeNull();
    expect(button).toBeEnabled();
  });

  it("keeps a shown spinner for the minimum visible time", () => {
    const { rerender } = render(<Button loading>Save</Button>);
    advance(showDelayMs);
    rerender(<Button loading={false}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(spinnerIn(button)).not.toBeNull();
    // Interaction comes back immediately; only the glyph lingers.
    expect(button).toBeEnabled();

    advance(minVisibleMs);
    expect(spinnerIn(button)).toBeNull();
  });
});
