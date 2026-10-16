import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";

/**
 * A bare `<SelectValue />` shows the selected item's label, not its value.
 * It used to render the raw value — `org:member`, `owner`, `zh-Hans-CN` —
 * in the trigger, in every locale.
 */
describe("compound Select value label", () => {
  it("renders the selected item's children in the trigger", () => {
    const { container } = render(
      <Select defaultValue="org:member">
        <SelectTrigger aria-label="Role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="org:member">成员</SelectItem>
          <SelectItem value="org:admin">管理员</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = container.querySelector('[aria-label="Role"]');
    expect(trigger?.textContent).toContain("成员");
    expect(trigger?.textContent).not.toContain("org:member");
  });

  it("finds items rendered from a mapped list", () => {
    const options = [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ];
    const { container } = render(
      <Select value="b">
        <SelectTrigger aria-label="Pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    expect(container.querySelector('[aria-label="Pick"]')?.textContent).toContain("Beta");
  });
});
