import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Grid } from "../grid-system";

/**
 * Responsive columns used to never apply: the base count is an inline style,
 * the breakpoint rules are class rules, and a class rule loses to inline.
 */
describe("Grid responsive rules", () => {
  it("breakpoint declarations are !important so they beat the inline base", () => {
    const { container } = render(
      <Grid.System>
        <Grid columns={{ sm: 1, md: 2, lg: 3 }} rows={{ sm: 6, md: 3, lg: 2 }}>
          <Grid.Cell column={{ sm: "1", md: "1/3" }}>a</Grid.Cell>
        </Grid>
      </Grid.System>,
    );
    const css = [...container.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    expect(css).toMatch(/grid-template-columns:repeat\(3, minmax\(0, 1fr\)\) !important;/);
    expect(css).toMatch(/--grid-columns:2 !important;/);
    expect(css).not.toMatch(/[^t];\s*}/); // every declaration in a rule ends in !important
  });
});
