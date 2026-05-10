import type { Meta, StoryObj } from "@storybook/react";
import { BorderTrail } from "./border-trail";

const meta = {
  title: "Primitives/BorderTrail",
  component: BorderTrail,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An animated element that travels continuously along the border of its parent. Great for loading states, attention indicators, and premium card highlights.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "range", min: 20, max: 200, step: 10 },
      description: "Size of the trail element in pixels",
    },
  },
} satisfies Meta<typeof BorderTrail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-32 w-64 rounded-xl border p-6">
      <BorderTrail />
      <p className="text-center text-sm">Default trail</p>
    </div>
  ),
};

export const GradientTrail: Story = {
  render: () => (
    <div className="relative h-40 w-72 rounded-xl border p-6">
      <BorderTrail
        className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        size={120}
      />
      <div className="text-center">
        <p className="font-bold">Premium Card</p>
        <p className="text-sm text-muted-foreground">With gradient trail</p>
      </div>
    </div>
  ),
};

export const LargeTrail: Story = {
  render: () => (
    <div className="relative h-40 w-72 rounded-2xl border p-6">
      <BorderTrail
        className="bg-amber-400"
        size={180}
        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
      />
      <p className="text-center text-sm">Large slow trail</p>
    </div>
  ),
};
