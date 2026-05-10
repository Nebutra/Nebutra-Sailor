import type { Meta, StoryObj } from "@storybook/react";
import { GradientAnimatedText } from "./gradient-animated-text";

const meta = {
  title: "Primitives/GradientAnimatedText",
  component: GradientAnimatedText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Text that cycles through gradient and solid states with staggered timing. Use 3 variants together for a build/ship/scale word reveal effect.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [1, 2, 3],
      description: "Animation phase offset",
    },
    theme: {
      control: "select",
      options: ["neon", "ai", "custom"],
      description: "Color theme preset",
    },
    duration: {
      control: { type: "range", min: 2, max: 20, step: 1 },
      description: "Animation cycle in seconds",
    },
  },
} satisfies Meta<typeof GradientAnimatedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Build.",
    variant: 1,
    theme: "neon",
    className: "text-5xl font-black",
  },
};

export const ThreeWordReveal: Story = {
  name: "Three-Word Staggered Reveal",
  render: () => (
    <div className="flex gap-2 text-5xl font-black">
      <GradientAnimatedText variant={1} theme="neon">
        Build.
      </GradientAnimatedText>
      <GradientAnimatedText variant={2} theme="neon">
        Ship.
      </GradientAnimatedText>
      <GradientAnimatedText variant={3} theme="neon">
        Scale.
      </GradientAnimatedText>
    </div>
  ),
};

export const AITheme: Story = {
  name: "AI Theme",
  render: () => (
    <div className="flex gap-2 text-5xl font-black">
      <GradientAnimatedText variant={1} theme="ai">
        Think.
      </GradientAnimatedText>
      <GradientAnimatedText variant={2} theme="ai">
        Learn.
      </GradientAnimatedText>
      <GradientAnimatedText variant={3} theme="ai">
        Grow.
      </GradientAnimatedText>
    </div>
  ),
};

export const CustomColors: Story = {
  args: {
    children: "Custom",
    variant: 1,
    gradientFrom: "#f97316",
    gradientTo: "#eab308",
    className: "text-5xl font-black",
  },
};
