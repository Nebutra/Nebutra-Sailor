import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "../color-picker";

const area = () => screen.getByRole("slider", { name: "Saturation and brightness" });
const hue = () => screen.getByRole("slider", { name: "Hue" });
const field = () => screen.getByRole("textbox", { name: "Colour value" }) as HTMLInputElement;

describe("ColorPicker", () => {
  it("shows the starting colour and exposes slider semantics", () => {
    render(<ColorPicker defaultValue="#ff0000" />);
    expect(field().value).toBe("#ff0000");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, Brightness 100%");
    expect(hue()).toHaveAttribute("aria-valuetext", "0°");
  });

  it("steps the area with arrows and ten at a time with Shift", () => {
    const onChange = vi.fn();
    const onChangeComplete = vi.fn();
    render(
      <ColorPicker
        defaultValue="#ff0000"
        onChange={onChange}
        onChangeComplete={onChangeComplete}
      />,
    );
    fireEvent.keyDown(area(), { key: "ArrowLeft" });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 99%, Brightness 100%");
    fireEvent.keyDown(area(), { key: "ArrowDown", shiftKey: true });
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 99%, Brightness 90%");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChangeComplete).toHaveBeenCalledTimes(2);
    expect(onChange.mock.lastCall?.[0]).toMatch(/^#[0-9a-f]{6}$/);
    expect(onChange.mock.lastCall?.[1].oklch).toMatch(/^oklch\(/);
  });

  it("steps the hue by 1 and 10 degrees and clamps with Home/End", () => {
    render(<ColorPicker defaultValue="#ff0000" />);
    fireEvent.keyDown(hue(), { key: "ArrowRight" });
    expect(hue()).toHaveAttribute("aria-valuenow", "1");
    fireEvent.keyDown(hue(), { key: "ArrowRight", shiftKey: true });
    expect(hue()).toHaveAttribute("aria-valuenow", "11");
    fireEvent.keyDown(hue(), { key: "Home" });
    expect(hue()).toHaveAttribute("aria-valuenow", "0");
  });

  it("keeps the hue when brightness reaches black", () => {
    render(<ColorPicker defaultValue="#00ff00" />);
    fireEvent.keyDown(area(), { key: "ArrowDown", shiftKey: true });
    for (let i = 0; i < 9; i++) fireEvent.keyDown(area(), { key: "ArrowDown", shiftKey: true });
    expect(field().value).toBe("#000000");
    expect(hue()).toHaveAttribute("aria-valuenow", "120");
  });

  it("applies a valid typed hex, flags an invalid one, and reverts on blur", () => {
    const onChange = vi.fn();
    const onChangeComplete = vi.fn();
    render(
      <ColorPicker
        defaultValue="#ff0000"
        onChange={onChange}
        onChangeComplete={onChangeComplete}
      />,
    );
    fireEvent.change(field(), { target: { value: "#00ff00" } });
    expect(onChange).toHaveBeenLastCalledWith("#00ff00", expect.any(Object));
    fireEvent.blur(field());
    expect(onChangeComplete).toHaveBeenCalledTimes(1);
    expect(field().value).toBe("#00ff00");

    fireEvent.change(field(), { target: { value: "#zzz" } });
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.blur(field());
    expect(field().value).toBe("#00ff00");
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("accepts rgb and oklch input after switching format", () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "RGB" }));
    expect(field().value).toBe("rgb(255 0 0)");
    fireEvent.change(field(), { target: { value: "rgb(0 0 255)" } });
    expect(onChange).toHaveBeenLastCalledWith("#0000ff", expect.any(Object));
    fireEvent.click(screen.getByRole("radio", { name: "OKLCH" }));
    expect(field().value).toMatch(/^oklch\(/);
  });

  it("follows a controlled value without echoing onChange", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColorPicker value="#ff0000" onChange={onChange} />);
    rerender(<ColorPicker value="#0000ff" onChange={onChange} />);
    expect(field().value).toBe("#0000ff");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits 8-digit hex only when alpha is on and below one", () => {
    const onChange = vi.fn();
    render(<ColorPicker alpha defaultValue="#ff0000" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Opacity" }), {
      key: "ArrowLeft",
      shiftKey: true,
    });
    expect(onChange).toHaveBeenLastCalledWith("#ff0000e6", expect.any(Object));
  });

  it("picks a preset and reports completion", () => {
    const onChangeComplete = vi.fn();
    render(
      <ColorPicker
        defaultValue="#ff0000"
        swatches={["#00ff00", "#0000ff"]}
        onChangeComplete={onChangeComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "#0000ff" }));
    expect(onChangeComplete).toHaveBeenCalledWith("#0000ff", expect.any(Object));
    expect(screen.getByRole("button", { name: "#0000ff" })).toHaveAttribute("aria-pressed", "true");
  });

  it("completes a pointer drag on release", () => {
    const onChange = vi.fn();
    const onChangeComplete = vi.fn();
    render(
      <ColorPicker
        defaultValue="#ff0000"
        onChange={onChange}
        onChangeComplete={onChangeComplete}
      />,
    );
    const surface = area().parentElement as HTMLElement;
    surface.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect;
    fireEvent.pointerDown(surface, { clientX: 50, clientY: 50, button: 0, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onChangeComplete).not.toHaveBeenCalled();
    fireEvent.pointerUp(surface, { pointerId: 1 });
    expect(onChangeComplete).toHaveBeenCalledTimes(1);
    expect(onChangeComplete.mock.lastCall?.[0]).toBe("#000000");
  });

  it("ignores input when disabled", () => {
    const onChange = vi.fn();
    render(<ColorPicker disabled defaultValue="#ff0000" onChange={onChange} />);
    fireEvent.keyDown(area(), { key: "ArrowLeft" });
    expect(onChange).not.toHaveBeenCalled();
    expect(field()).toBeDisabled();
  });
});
