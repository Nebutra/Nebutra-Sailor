import type { Meta, StoryObj } from "@storybook/react";
import { CanvasRevealEffect } from "./canvas-reveal-effect";

const meta = {
  title: "Primitives/CanvasRevealEffect",
  component: CanvasRevealEffect,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "WebGL dot matrix animation effect powered by Three.js and @react-three/fiber. Colors are specified as RGB arrays (0-255). Requires three and @react-three/fiber installed.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    animationSpeed: { control: { type: "range", min: 0.1, max: 2, step: 0.1 } },
    dotSize: { control: { type: "range", min: 1, max: 8, step: 1 } },
    showGradient: { control: "boolean" },
  },
} satisfies Meta<typeof CanvasRevealEffect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[400px] w-full">
      <CanvasRevealEffect animationSpeed={0.4} colors={[[0, 255, 255]]} dotSize={3} />
    </div>
  ),
};

export const BlueViolet: Story = {
  render: () => (
    <div className="h-[400px] w-full">
      <CanvasRevealEffect
        animationSpeed={0.5}
        colors={[
          [59, 130, 246],
          [139, 92, 246],
        ]}
        dotSize={3}
        containerClassName="bg-background"
      />
    </div>
  ),
};

export const GreenMatrix: Story = {
  render: () => (
    <div className="h-[400px] w-full">
      <CanvasRevealEffect
        animationSpeed={0.6}
        colors={[[0, 255, 100]]}
        dotSize={2}
        containerClassName="bg-black"
      />
    </div>
  ),
};

export const WarmGlow: Story = {
  render: () => (
    <div className="h-[400px] w-full">
      <CanvasRevealEffect
        animationSpeed={0.3}
        colors={[
          [255, 100, 50],
          [255, 200, 50],
        ]}
        dotSize={4}
        showGradient={false}
        containerClassName="bg-orange-950"
      />
    </div>
  ),
};

export const SlowLarge: Story = {
  render: () => (
    <div className="h-[400px] w-full">
      <CanvasRevealEffect
        animationSpeed={0.1}
        colors={[[200, 100, 255]]}
        dotSize={6}
        containerClassName="bg-violet-950"
      />
    </div>
  ),
};
