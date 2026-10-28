import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SplitButton } from "../split-button";

function renderPair(dir: "ltr" | "rtl") {
  render(
    <div dir={dir}>
      <SplitButton menuButtonLabel="More options" menuItems={null}>
        Deploy
      </SplitButton>
    </div>,
  );
  return {
    primary: screen.getByRole("button", { name: "Deploy" }),
    chevron: screen.getByRole("button", { name: "More options" }),
  };
}

describe("SplitButton seam", () => {
  it.each(["ltr", "rtl"] as const)("uses logical seam classes only (%s)", (dir) => {
    const { primary, chevron } = renderPair(dir);
    expect(primary.className).toContain("rounded-e-none");
    expect(chevron.className).toContain("rounded-s-none");
    expect(chevron.className).toMatch(/(^|\s)border-s(\s|$)/);
    for (const element of [primary, chevron]) {
      expect(element.className).not.toMatch(/rounded-[lr]-none|(^|\s)border-[lr](\s|$)/);
    }
  });
});
