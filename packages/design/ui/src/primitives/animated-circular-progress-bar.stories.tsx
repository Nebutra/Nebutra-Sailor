import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { AnimatedCircularProgressBar } from "./animated-circular-progress-bar";

const meta = {
  title: "Primitives/AnimatedCircularProgressBar",
  component: AnimatedCircularProgressBar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Circular gauge that animates its arc and percentage when `value` changes. The arc colors take any CSS color, so pass tokens rather than literals.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    min: { control: "number" },
    max: { control: "number" },
  },
  args: {
    value: 64,
    gaugePrimaryColor: "var(--primary)",
    gaugeSecondaryColor: "var(--muted)",
  },
} satisfies Meta<typeof AnimatedCircularProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { value: 0 } };

export const Complete: Story = { args: { value: 100 } };

export const CustomRange: Story = {
  name: "Custom range (min / max)",
  args: { min: 0, max: 8, value: 6 },
};

export const Animated: Story = {
  render: (args) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 10)), 1200);
      return () => clearInterval(id);
    }, []);
    return <AnimatedCircularProgressBar {...args} value={value} />;
  },
};
