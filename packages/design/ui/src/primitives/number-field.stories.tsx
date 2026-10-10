import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { NumberField } from "./number-field";

const meta = {
  title: "Primitives/NumberField",
  component: NumberField,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Numeric entry on Base UI NumberField. Replaces native number inputs: themed steppers, arrow-key stepping (Shift = largeStep), wheel scrubbing off by default, locale-aware parsing and formatting, min/max clamping, and an optional drag-to-scrub label. `value` accepts a number, `null`, or a numeric string so string-state forms migrate unchanged.",
      },
    },
  },
  tags: ["autodocs"],
  args: { id: "story-number", label: "Quantity", defaultValue: 3, min: 0, max: 10 },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Quantity");
    await userEvent.click(canvas.getByRole("button", { name: "Increase" }));
    expect(input).toHaveValue("4");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveValue("2");
  },
};

export const Clamped: Story = {
  args: { id: "story-clamped", label: "Seats", defaultValue: 10, min: 1, max: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("button", { name: "Increase" })).toBeDisabled();
  },
};

export const Currency: Story = {
  args: {
    id: "story-currency",
    label: "Monthly budget",
    locale: "en-US",
    format: { style: "currency", currency: "USD" },
    step: 50,
    defaultValue: 1200,
    min: undefined,
    max: undefined,
  },
};

export const ScrubLabelWithUnit: Story = {
  args: {
    id: "story-scrub",
    label: "Padding",
    scrub: true,
    suffix: "px",
    defaultValue: 16,
    max: 64,
  },
};

export const WithError: Story = {
  args: {
    id: "story-error",
    label: "Port",
    defaultValue: 70000,
    min: undefined,
    max: undefined,
    error: "Use a port between 1 and 65535.",
  },
};
