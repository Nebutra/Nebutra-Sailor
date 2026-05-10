import type { Meta, StoryObj } from "@storybook/react";
import { TextShimmer } from "./text-shimmer";

const meta = {
  title: "Primitives/TextShimmer",
  component: TextShimmer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A smooth shimmer/glint sweeps continuously through text. Perfect for AI loading states, premium labels, and call-to-action emphasis.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["p", "span", "h1", "h2", "h3", "div"],
      description: "HTML element to render as",
    },
    duration: {
      control: { type: "range", min: 0.5, max: 5, step: 0.5 },
      description: "Shimmer sweep duration in seconds",
    },
    spread: {
      control: { type: "range", min: 1, max: 6, step: 1 },
      description: "Shimmer beam spread multiplier",
    },
    paused: {
      control: "boolean",
      description: "Pause the animation",
    },
  },
} satisfies Meta<typeof TextShimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Generating code...",
    duration: 1,
  },
};

export const AITyping: Story = {
  name: "AI Typing Indicator",
  args: {
    children: "Claude is thinking...",
    duration: 1.5,
    className: "text-sm text-muted-foreground",
  },
};

export const BlueTheme: Story = {
  args: {
    children: "Premium Feature",
    duration: 1.2,
    className:
      "text-xl [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.200)]",
  },
};

export const Heading: Story = {
  args: {
    children: "Welcome",
    as: "h1",
    className: "text-4xl font-bold",
    duration: 3,
  },
};

export const Paused: Story = {
  args: {
    children: "Static (paused)",
    paused: true,
  },
};
