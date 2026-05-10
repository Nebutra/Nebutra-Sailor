import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedGradientText } from "./animated-gradient-text";

const meta = {
  title: "Primitives/AnimatedGradientText",
  component: AnimatedGradientText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Text with a continuously scrolling gradient background. The gradient moves horizontally creating a shimmering effect. Requires the animate-gradient CSS class in global styles.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    speed: { control: { type: "range", min: 0.5, max: 5, step: 0.5 } },
    colorFrom: { control: "color" },
    colorTo: { control: "color" },
  },
} satisfies Meta<typeof AnimatedGradientText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <h1 className="text-4xl font-bold">
      <AnimatedGradientText>Animated Gradient Text</AnimatedGradientText>
    </h1>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <h2 className="text-3xl font-bold">
      <AnimatedGradientText colorFrom="#ff0080" colorTo="#7928ca">
        Pink to Purple
      </AnimatedGradientText>
    </h2>
  ),
};

export const BlueToGreen: Story = {
  render: () => (
    <h2 className="text-3xl font-bold">
      <AnimatedGradientText colorFrom="#00C6FF" colorTo="#00FF87">
        Blue to Green
      </AnimatedGradientText>
    </h2>
  ),
};

export const FastAnimation: Story = {
  render: () => (
    <h2 className="text-3xl font-bold">
      <AnimatedGradientText speed={3}>Fast Scrolling</AnimatedGradientText>
    </h2>
  ),
};

export const SlowAnimation: Story = {
  render: () => (
    <h2 className="text-3xl font-bold">
      <AnimatedGradientText speed={0.5}>Slow Shimmer</AnimatedGradientText>
    </h2>
  ),
};

export const HeroHeading: Story = {
  render: () => (
    <div className="text-center space-y-2">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Introducing
      </p>
      <h1 className="text-6xl font-extrabold">
        <AnimatedGradientText colorFrom="#0033FE" colorTo="#00e5ff">
          Nebutra UI
        </AnimatedGradientText>
      </h1>
      <p className="text-muted-foreground text-lg">The design system built for scale.</p>
    </div>
  ),
};
