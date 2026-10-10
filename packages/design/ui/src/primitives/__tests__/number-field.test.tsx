import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { NumberField } from "../number-field";

function Controlled({
  initial = "",
  onValue,
  ...props
}: { initial?: string; onValue?: (value: number | null) => void } & Omit<
  React.ComponentProps<typeof NumberField>,
  "value" | "onValueChange"
>) {
  const [value, setValue] = React.useState(initial);
  return (
    <NumberField
      value={value}
      onValueChange={(next) => {
        setValue(next == null ? "" : String(next));
        onValue?.(next);
      }}
      {...props}
    />
  );
}

describe("NumberField", () => {
  it("labels the input, links helper and error text, and exposes steppers", () => {
    render(
      <NumberField
        id="width"
        label="Width"
        description="In pixels."
        error="Must be positive."
        defaultValue={4}
      />,
    );
    const input = screen.getByLabelText("Width");
    expect(input).toHaveValue("4");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("In pixels. Must be positive.");
    expect(screen.getByRole("button", { name: "Increase" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease" })).toBeInTheDocument();
    // Never the OS number input: no spin buttons, no "e"/"+" acceptance.
    expect(input).not.toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("inputmode");
  });

  it("steps with the stepper buttons and respects min / max", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled id="n" label="Count" initial="9" max={10} min={8} onValue={onValue} />);

    await user.click(screen.getByRole("button", { name: "Increase" }));
    expect(onValue).toHaveBeenLastCalledWith(10);
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Decrease" }));
    await user.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onValue).toHaveBeenLastCalledWith(8);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  it("steps with ArrowUp / ArrowDown and largeStep with Shift", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled id="n" label="Amount" initial="5" largeStep={10} onValue={onValue} />);
    const input = screen.getByLabelText("Amount");

    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(onValue).toHaveBeenLastCalledWith(6);
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(onValue).toHaveBeenLastCalledWith(16);
    await user.keyboard("{ArrowDown}");
    expect(onValue).toHaveBeenLastCalledWith(15);
  });

  it("ignores the mouse wheel unless allowWheelScrub is set", () => {
    const onValue = vi.fn();
    render(<Controlled id="n" label="Port" initial="80" onValue={onValue} />);
    const input = screen.getByLabelText("Port");
    input.focus();
    fireEvent.wheel(input, { deltaY: -100 });
    expect(onValue).not.toHaveBeenCalled();
    expect(input).toHaveValue("80");
  });

  it("accepts a numeric string value and reports null when cleared", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled id="n" label="Bill" initial="12.5" onValue={onValue} />);
    const input = screen.getByLabelText("Bill");
    expect(input).toHaveValue("12.5");

    await user.clear(input);
    await user.tab();
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it("keeps full precision and no grouping by default, and formats when asked", () => {
    const { rerender } = render(<NumberField aria-label="Value" defaultValue={12345.6789} />);
    expect(screen.getByLabelText("Value")).toHaveValue("12345.6789");

    rerender(
      <NumberField
        key="formatted"
        aria-label="Value"
        locale="en-US"
        format={{ style: "currency", currency: "USD" }}
        defaultValue={12345.6789}
      />,
    );
    expect(screen.getByLabelText("Value")).toHaveValue("$12,345.68");
  });

  it("can hide the steppers", () => {
    render(<NumberField aria-label="Compact" hideSteppers />);
    expect(screen.queryByRole("button", { name: "Increase" })).toBeNull();
  });
});
