import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slider } from "../slider";

describe("Slider fill direction", () => {
  it("fills from the inline start: a to-right gradient in LTR, a to-left one under rtl", () => {
    render(
      <div dir="rtl">
        <Slider aria-label="Volume" defaultValue={30} />
      </div>,
    );
    const className = screen.getByRole("slider").className;
    expect(className).toMatch(/(^|\s)bg-\[linear-gradient\(to_right,/);
    expect(className).toMatch(/rtl:bg-\[linear-gradient\(to_left,/);
  });
});
