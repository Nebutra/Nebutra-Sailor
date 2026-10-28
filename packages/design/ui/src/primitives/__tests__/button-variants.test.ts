import { describe, expect, it } from "vitest";
import { buttonVariants } from "../button-variants";

// A control that sets no text colour inherits the document's. Inside a dark island on a
// light page (the docs Split pane) that is dark ink on a dark fill: the button vanishes.
describe("buttonVariants text colour", () => {
  it.each(["outline", "ghost"] as const)("%s names its own text colour", (variant) => {
    const classes = buttonVariants({ variant }).split(/\s+/);
    expect(classes).toContain("text-foreground");
  });
});
