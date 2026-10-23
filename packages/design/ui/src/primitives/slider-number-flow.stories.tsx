import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SliderNumberFlow } from "./slider-number-flow";

const meta = {
  title: "Primitives/SliderNumberFlow",
  component: SliderNumberFlow,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Slider that shows its value above the thumb with an animated number. Control it with `value` so the readout stays in sync.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80 pt-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SliderNumberFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled({
  initial,
  max = 100,
  step = 1,
}: {
  initial: number;
  max?: number;
  step?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SliderNumberFlow
      value={value}
      max={max}
      step={step}
      valueLabel="Value"
      onValueChange={(next) => setValue(Array.isArray(next) ? (next[0] ?? 0) : next)}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled initial={40} />,
};

export const CoarseSteps: Story = {
  render: () => <Controlled initial={50} step={10} />,
};

export const LargeRange: Story = {
  render: () => <Controlled initial={1200} max={5000} step={100} />,
};

export const Disabled: Story = {
  args: { value: 30, disabled: true, valueLabel: "Value" },
};
