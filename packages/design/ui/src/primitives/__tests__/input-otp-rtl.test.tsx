import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../input-otp";

// input-otp polls document.elementFromPoint to detect password-manager badges; jsdom has none.
const original = document.elementFromPoint;
beforeAll(() => {
  document.elementFromPoint = () => null;
});
afterAll(() => {
  document.elementFromPoint = original;
});

function Otp(props: Partial<React.ComponentProps<typeof InputOTP>>) {
  return (
    <div dir="rtl">
      <InputOTP aria-label="Code" maxLength={4} {...props}>
        <InputOTPGroup>
          <InputOTPSlot data-testid="slot" index={0} />
          <InputOTPSlot data-testid="slot" index={1} />
          <InputOTPSlot data-testid="slot" index={2} />
          <InputOTPSlot data-testid="slot" index={3} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

describe("InputOTP error", () => {
  it("marks the input invalid and restyles every slot when error is set", () => {
    render(<Otp error />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
    for (const slot of screen.getAllByTestId("slot")) {
      expect(slot.className).toContain("border-destructive");
      expect(slot).toHaveAttribute("data-invalid", "true");
    }
  });

  it("leaves the slots in the normal style without error", () => {
    render(<Otp />);
    expect(screen.getByLabelText("Code")).not.toHaveAttribute("aria-invalid", "true");
    for (const slot of screen.getAllByTestId("slot")) {
      expect(slot.className).not.toContain("border-destructive");
    }
  });
});

describe("InputOTP onComplete", () => {
  it("fires once when an uncontrolled field is filled", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Otp onComplete={onComplete} />);
    await user.type(screen.getByLabelText("Code"), "1234");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("1234");
  });
});

describe("InputOTP slots under rtl", () => {
  it("uses logical edge classes only", () => {
    render(<Otp />);
    for (const slot of screen.getAllByTestId("slot")) {
      expect(slot.className).not.toMatch(/(^|[\s:])(rounded-[lr]|border-[lr])(-|\s|$)/);
    }
  });
});
