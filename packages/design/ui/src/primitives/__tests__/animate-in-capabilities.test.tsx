import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnimatePresence } from "../../shared/animation/motion";
import { AnimateIn, AnimateSwap } from "../animate-in";
import { Checkbox } from "../checkbox-group";
import { CheckGlyph, IndeterminateGlyph } from "../control-glyph";

describe("AnimateIn DOM passthrough", () => {
  it("forwards role, aria and event handlers so a drawer need not hand-roll m.div", async () => {
    const onClick = vi.fn();

    render(
      <AnimateIn preset="slideFromRight" role="dialog" aria-label="Main menu" onClick={onClick}>
        <span>panel</span>
      </AnimateIn>,
    );

    const dialog = screen.getByRole("dialog", { name: "Main menu" });
    expect(dialog).toBeInTheDocument();

    dialog.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders without children for a decorative backdrop", () => {
    render(<AnimateIn preset="fade" className="backdrop" data-testid="backdrop" />);
    expect(screen.getByTestId("backdrop")).toBeInTheDocument();
  });

  it("still exits under AnimatePresence despite the LazyMotion wrapper", async () => {
    // AnimateIn renders LazyMotion > m.div, so the motion element is not the
    // direct child of AnimatePresence. Presence is context-based, so exit does
    // propagate — this asserts that, because a drawer that never unmounts would
    // leave a fixed overlay covering the page.
    function Drawer({ open }: { open: boolean }) {
      return (
        <AnimatePresence>
          {open && (
            <>
              <AnimateIn preset="fade" data-testid="drawer-backdrop" />
              <AnimateIn preset="slideFromRight" role="dialog" aria-label="Main menu">
                <span>menu</span>
              </AnimateIn>
            </>
          )}
        </AnimatePresence>
      );
    }

    const { rerender } = render(<Drawer open />);
    expect(screen.getByRole("dialog", { name: "Main menu" })).toBeInTheDocument();

    rerender(<Drawer open={false} />);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Main menu" })).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("drawer-backdrop")).not.toBeInTheDocument();
  });
});

describe("AnimateSwap", () => {
  it("renders the keyed content and forwards tabpanel semantics", async () => {
    const { rerender } = render(
      <AnimateSwap swapKey="one" preset="swap" role="tabpanel" aria-labelledby="tab-one">
        <span>first</span>
      </AnimateSwap>,
    );

    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-one");
    expect(screen.getByText("first")).toBeInTheDocument();

    rerender(
      <AnimateSwap swapKey="two" preset="swap" role="tabpanel" aria-labelledby="tab-two">
        <span>second</span>
      </AnimateSwap>,
    );

    // mode="wait" holds the incoming content until the outgoing exit resolves,
    // so this is deliberately asynchronous. If it ever hangs, the swap is stuck.
    expect(await screen.findByText("second")).toBeInTheDocument();
    expect(screen.queryByText("first")).not.toBeInTheDocument();
  });
});

describe("control glyphs", () => {
  // These numbers are the contract, not incidental: a 16-unit viewBox rendered at
  // 16px keeps strokeWidth equal to the rendered pixel weight, which is what makes
  // the glyph interchangeable with the per-control hand-drawn ticks it replaced.
  it("draws the checkmark at 1:1 with the rendered control", () => {
    const { container } = render(<CheckGlyph />);
    const svg = container.querySelector("svg");
    const path = container.querySelector("path");

    expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
    expect(svg).toHaveAttribute("width", "16");
    expect(path).toHaveAttribute("d", "M11.2 5.6L6.8 10L4.8 8");
    expect(path).toHaveAttribute("stroke-width", "1.6");
  });

  it("leaves stroke and fill to be inherited from the control surface", () => {
    const { container } = render(<CheckGlyph />);
    const svg = container.querySelector("svg");

    // The unchecked checkbox hides its tick by painting it in the box's own
    // colour. A hardcoded stroke or fill here would make it permanently visible.
    expect(svg).not.toHaveAttribute("stroke");
    expect(svg).not.toHaveAttribute("fill");
  });

  it("centres the indeterminate dash on both axes", () => {
    const { container } = render(<IndeterminateGlyph />);
    const line = container.querySelector("line");

    expect(line).toHaveAttribute("x1", "4");
    expect(line).toHaveAttribute("x2", "12");
    expect(line).toHaveAttribute("y1", "8");
    expect(line).toHaveAttribute("y2", "8");
  });

  it("is what Checkbox renders, in both states", () => {
    const { container, rerender } = render(<Checkbox checked>Ship it</Checkbox>);
    expect(container.querySelector("path")).toHaveAttribute("d", "M11.2 5.6L6.8 10L4.8 8");

    rerender(<Checkbox indeterminate>Ship it</Checkbox>);
    expect(container.querySelector("line")).toHaveAttribute("x2", "12");
  });
});
