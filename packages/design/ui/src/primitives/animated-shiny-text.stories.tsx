import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedShinyText } from "./animated-shiny-text";

const meta = {
  title: "Primitives/AnimatedShinyText",
  component: AnimatedShinyText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Text with an animated light-glare shimmer sweeping across. Ideal for badges, announcements, and launch headlines.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    shimmerWidth: {
      control: { type: "range", min: 50, max: 400, step: 10 },
      description: "Width of the shimmer highlight in pixels",
    },
    duration: {
      control: { type: "range", min: 1, max: 20, step: 1 },
      description: "Animation cycle duration in seconds",
    },
  },
} satisfies Meta<typeof AnimatedShinyText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "✨ Introducing our new feature",
  },
};

export const InBadge: Story = {
  name: "In Announcement Badge",
  render: () => (
    <div className="rounded-full border border-border px-4 py-1.5 text-sm">
      <AnimatedShinyText>🎉 Now in public beta</AnimatedShinyText>
    </div>
  ),
};

export const WideShimmer: Story = {
  args: {
    children: "Wide shimmer effect",
    shimmerWidth: 250,
  },
};

export const FastAnimation: Story = {
  args: {
    children: "Fast animation",
    duration: 3,
  },
};

export const LargeText: Story = {
  args: {
    children: "Premium Feature Unlocked",
    className: "text-2xl font-bold",
    shimmerWidth: 200,
  },
};
