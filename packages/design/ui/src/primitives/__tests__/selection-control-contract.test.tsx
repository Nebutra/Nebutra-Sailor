import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../checkbox-group";
import { controlFocusProxyClassName } from "../form-control";
import { RadioGroup } from "../radio-group";
import { Toggle } from "../toggle";

/**
 * One contract for the controls that draw a proxy over a hidden input.
 *
 * Each of them had picked its own "on" colour — the checkbox kept Geist's
 * gray-1000, the radio --neutral-12 — which matched the House ink by
 * coincidence and stayed black under a Brand Package with a coloured action
 * (Stripe: indigo button, black checkbox). Each also lost keyboard focus: the
 * global :focus-visible outline landed on the 1px sr-only input. And the empty
 * checkbox edge was a 1.2:1 hairline.
 *
 * On = --primary, the empty edge = --control-border, focus = the shared proxy.
 */
const proxyOf = (input: HTMLElement) => input.nextElementSibling as HTMLElement;

describe("selection controls share one contract", () => {
  it("checkbox: primary when on, control border when off, focus on the proxy", () => {
    render(
      <>
        <Checkbox defaultChecked>On</Checkbox>
        <Checkbox>Off</Checkbox>
      </>,
    );
    const on = proxyOf(screen.getByLabelText("On"));
    const off = proxyOf(screen.getByLabelText("Off"));
    expect(on.className).toContain("bg-primary");
    expect(on.className).toContain("text-primary-foreground");
    expect(off.className).toContain("border-[var(--control-border)]");
    for (const cls of controlFocusProxyClassName.split(" ")) expect(on.className).toContain(cls);
  });

  it("checkbox forwards native input props instead of dropping them", () => {
    render(<Checkbox aria-label="Agree to the terms" required name="terms" />);
    const input = screen.getByRole("checkbox", { name: "Agree to the terms" });
    expect(input).toHaveAttribute("name", "terms");
    expect(input).toBeRequired();
  });

  it("radio: primary when on, control border when off, focus on the proxy", () => {
    render(
      <RadioGroup defaultValue="a" label="Region">
        <RadioGroup.Item value="a">A</RadioGroup.Item>
        <RadioGroup.Item value="b">B</RadioGroup.Item>
      </RadioGroup>,
    );
    const proxy = proxyOf(screen.getByRole("radio", { name: "A" }));
    expect(proxy.className).toContain("peer-checked:border-primary");
    expect(proxy.className).toContain("border-[var(--control-border)]");
    expect(proxy.className).not.toContain("peer-focus-visible:outline-none");
    for (const cls of controlFocusProxyClassName.split(" ")) expect(proxy.className).toContain(cls);
  });

  it("toggle: focus on the proxy", () => {
    render(<Toggle aria-label="Notifications" />);
    const proxy = proxyOf(screen.getByLabelText("Notifications"));
    for (const cls of controlFocusProxyClassName.split(" ")) expect(proxy.className).toContain(cls);
  });
});
