// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DynamicIslandTOC } from "../dynamic-island-toc";

describe("DynamicIslandTOC", () => {
  // A transformed ancestor is the containing block for position:fixed. In place,
  // the blog's animation wrapper pinned the "bottom of the screen" pill to the
  // bottom of the article instead.
  it("renders into <body>, outside a transformed ancestor", () => {
    render(
      <div data-testid="wrapper" style={{ transform: "translateY(0)" }}>
        <article>
          <h2 id="one">One</h2>
          <h2 id="two">Two</h2>
        </article>
        <DynamicIslandTOC selector="article h2" ariaLabel="Contents" />
      </div>,
    );
    const nav = screen.getByRole("navigation", { name: "Contents" });
    expect(nav.parentElement).toBe(document.body);
    expect(screen.getByTestId("wrapper").contains(nav)).toBe(false);
  });
});
