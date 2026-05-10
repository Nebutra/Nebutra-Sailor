import type { Meta, StoryObj } from "@storybook/react";
import { StarsCanvas } from "./stars-canvas";

const meta = {
  title: "Primitives/StarsCanvas",
  component: StarsCanvas,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Canvas-based animated starfield with orbiting, twinkling stars. Space-themed ambient background for hero sections, dashboards, and loading screens.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    hue: { control: { type: "range", min: 0, max: 360, step: 10 } },
    maxStars: { control: { type: "range", min: 100, max: 3000, step: 100 } },
    speedMultiplier: {
      control: { type: "range", min: 0.1, max: 3, step: 0.1 },
    },
    brightness: { control: { type: "range", min: 0.1, max: 1, step: 0.1 } },
    paused: { control: "boolean" },
    transparent: { control: "boolean" },
  },
} satisfies Meta<typeof StarsCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden bg-background rounded-xl">
      <StarsCanvas position="absolute" zIndex={0} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold text-white">Starfield</h2>
      </div>
    </div>
  ),
};

export const PurpleStars: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl">
      <StarsCanvas position="absolute" zIndex={0} hue={280} brightness={0.8} />
    </div>
  ),
};

export const DenseSlow: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl">
      <StarsCanvas
        position="absolute"
        zIndex={0}
        maxStars={2000}
        speedMultiplier={0.3}
        twinkleIntensity={10}
      />
    </div>
  ),
};
