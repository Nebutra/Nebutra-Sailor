import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

const meta = {
  title: "Primitives/InputOTP",
  component: InputOTP,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One-time-passcode / verification-code entry, built on `input-otp`. `InputOTP` owns the real (visually-hidden) text input and the `maxLength`; `InputOTPSlot` reads its rendered character and caret state from context by numeric `index` — group slots with `InputOTPGroup`, split them into chunks with `InputOTPSeparator` for a `123 456` style code.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InputOTP>;

export default meta;
type Story = StoryObj<typeof InputOTP>;

function ControlledOTP({ maxLength = 6 }: { maxLength?: number }) {
  const [value, setValue] = useState("");
  return (
    <InputOTP maxLength={maxLength} value={value} onChange={setValue}>
      <InputOTPGroup>
        {Array.from({ length: maxLength }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

export const Default: Story = {
  render: () => <ControlledOTP />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const hiddenInput = canvas.getByRole("textbox");

    await userEvent.click(hiddenInput);
    await userEvent.keyboard("123456");

    expect(hiddenInput).toHaveValue("123456");
  },
};

/** `InputOTPSeparator` splits the slots into a `123 456` grouped layout. */
export const GroupedWithSeparator: Story = {
  name: "Grouped (with separator)",
  render: () => {
    const [value, setValue] = useState("");
    return (
      <InputOTP maxLength={6} value={value} onChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    );
  },
};

export const FourDigit: Story = {
  name: "4-digit PIN",
  render: () => <ControlledOTP maxLength={4} />,
};

export const Disabled: Story = {
  render: () => (
    <InputOTP maxLength={6} disabled value="123">
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const Filled: Story = {
  name: "Complete (filled) value",
  render: () => (
    <InputOTP maxLength={6} value="482913">
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6">
      <ControlledOTP />
    </div>
  ),
};
