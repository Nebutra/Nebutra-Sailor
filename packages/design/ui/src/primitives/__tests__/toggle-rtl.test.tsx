import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toggle } from "../toggle";

describe("Toggle thumb direction", () => {
  it("travels towards the track end in both directions, not off the track in RTL", () => {
    const { container } = render(<Toggle aria-label="Notifications" defaultChecked />);
    const track = container.querySelector("[class*='peer-checked']");
    const classes = track?.className ?? "";
    // LTR moves the thumb by +x; RTL starts at the right edge, so it must move by -x.
    expect(classes).toMatch(
      /peer-checked:\[&>span\]:translate-x-\[var\(--toggle-thumb-translate\)\]/,
    );
    expect(classes).toMatch(
      /rtl:peer-checked:\[&>span\]:-translate-x-\[var\(--toggle-thumb-translate\)\]/,
    );
  });
});
