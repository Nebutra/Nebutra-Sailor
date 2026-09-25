import { describe, expect, it } from "vitest";
import { cn, DESIGN_SYSTEM_TEXT_SIZES } from "../cn";

describe("cn", () => {
  it.each(DESIGN_SYSTEM_TEXT_SIZES)("keeps text-%s next to a text colour", (size) => {
    expect(cn(`text-${size}`, "text-destructive")).toBe(`text-${size} text-destructive`);
    expect(cn(`text-${size}`, "text-muted-foreground")).toBe(`text-${size} text-muted-foreground`);
  });

  it("still lets a later size override an earlier one", () => {
    expect(cn("text-label", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-meta")).toBe("text-meta");
  });
});
