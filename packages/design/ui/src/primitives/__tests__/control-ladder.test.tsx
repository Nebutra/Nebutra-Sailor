/**
 * Every single-line control reads the shared control ladder and field radius,
 * and the Alert status variants paint. Both regressions were measured on
 * 2026-10-10 (docs/reports/2026-10-10-ui-primitives-review.md).
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertTitle } from "../alert";
import { buttonVariants } from "../button-variants";
import { Input } from "../input";
import { overlayPrimitiveClassNames } from "../overlay";
import { Select, SelectTrigger, SelectValue } from "../select";
import { Textarea } from "../textarea";

describe("control ladder", () => {
  it("Input takes height, type size and corner from the shared tokens", () => {
    const { container } = render(<Input aria-label="x" size="sm" />);
    const style = (container.querySelector("input") as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--control-height-sm");
    expect(style).toContain("var(--control-font-size-sm");
    expect(style).toContain("var(--radius-inputs");
  });

  it("Input's clear button carries no inline outline that would beat the focus ring", () => {
    const { container } = render(<Input aria-label="x" clearable defaultValue="abc" />);
    const button = container.querySelector("button") as HTMLElement;
    expect(button.getAttribute("style") ?? "").not.toMatch(/outline/);
  });

  it("Select trigger keeps its corner and drops the global outline on keyboard focus", () => {
    // The trigger is a <button>, so the unlayered :focus-visible rule in
    // design-tokens/static/base.css matches it and beats `outline-none` and
    // `rounded-*` utilities; only inline values hold the tokenized contract.
    const { container } = render(
      <Select defaultValue="a">
        <SelectTrigger aria-label="x">
          <SelectValue />
        </SelectTrigger>
      </Select>,
    );
    const style = (container.querySelector("button") as HTMLElement).getAttribute("style") ?? "";
    expect(style).toMatch(/outline:\s*none/);
    expect(style).toContain("border-radius: var(--select-radius)");
  });

  it("Textarea corner stops at the card radius", () => {
    const { container } = render(<Textarea aria-label="x" />);
    const style = (container.querySelector("textarea") as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("min(var(--radius-inputs");
  });

  it("Button keeps one corner across sizes", () => {
    for (const size of ["tiny", "sm", "default", "lg"] as const) {
      expect(buttonVariants({ size, variant: "outline" })).not.toMatch(
        /rounded-\[var\(--radius-(sm|lg)\)\]/,
      );
    }
  });

  it("overlay primitive classes no longer override the surface tokens", () => {
    for (const v of [
      overlayPrimitiveClassNames.modalSurface,
      overlayPrimitiveClassNames.popoverSurface,
      overlayPrimitiveClassNames.menuSurface,
    ])
      expect(v).not.toMatch(/rounded-|bg-|shadow-/);
  });
});

describe("Alert", () => {
  it.each([
    ["success", "bg-success"],
    ["info", "bg-info"],
    ["warning", "bg-warning"],
  ] as const)("solid %s paints its fill", (variant, cls) => {
    const { container } = render(
      <Alert variant={variant}>
        <AlertTitle>t</AlertTitle>
      </Alert>,
    );
    expect(container.firstElementChild?.className).toContain(cls);
  });

  it("no class is a half of a split arbitrary value", () => {
    const { container } = render(
      <Alert appearance="outline" variant="warning">
        <AlertTitle>t</AlertTitle>
      </Alert>,
    );
    for (const c of (container.firstElementChild?.className ?? "").split(/\s+/)) {
      const opens = (c.match(/\[/g) ?? []).length;
      const closes = (c.match(/\]/g) ?? []).length;
      expect(opens, c).toBe(closes);
    }
  });

  it("stroke appearance draws an edge", () => {
    const { container } = render(
      <Alert appearance="stroke" variant="destructive">
        <AlertTitle>t</AlertTitle>
      </Alert>,
    );
    expect(container.firstElementChild?.className).toMatch(/(^|\s)border(\s|$)/);
  });
});
