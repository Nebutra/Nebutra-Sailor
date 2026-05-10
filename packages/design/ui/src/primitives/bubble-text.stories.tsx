import type { Meta, StoryObj } from "@storybook/react";
import { BubbleText } from "./bubble-text";

const meta = {
  title: "Primitives/BubbleText",
  component: BubbleText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Interactive text where hovering a character creates a bold bubble ripple effect across neighboring characters.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span"],
      description: "HTML element to render",
    },
    rippleDistance: {
      control: { type: "range", min: 1, max: 5, step: 1 },
      description: "Characters affected by hover ripple in each direction",
    },
  },
} satisfies Meta<typeof BubbleText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Hover over me!",
    className: "text-5xl text-indigo-300",
  },
};

export const HeroHeading: Story = {
  args: {
    children: "Interactive Hero",
    as: "h1",
    className: "text-6xl font-bold text-blue-400",
  },
};

export const WideRipple: Story = {
  args: {
    children: "Wide Ripple Effect",
    rippleDistance: 4,
    className: "text-4xl text-purple-400",
  },
};

export const TightRipple: Story = {
  args: {
    children: "Tight Bubble",
    rippleDistance: 1,
    className: "text-5xl text-emerald-400",
  },
};
