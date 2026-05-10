import type { Meta, StoryObj } from "@storybook/react";
import { WaveAnimation } from "./wave-animation";

const meta = {
  title: "Primitives/WaveAnimation",
  component: WaveAnimation,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Canvas-based animated wave bars visualization. Creates an audio-visualizer-like wave pattern with trailing effect.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    barCount: { control: { type: "range", min: 5, max: 50, step: 5 } },
    barWidth: { control: { type: "range", min: 20, max: 300, step: 10 } },
    speed: { control: { type: "range", min: 0.1, max: 3, step: 0.1 } },
    amplitude: { control: { type: "range", min: 0.1, max: 3, step: 0.1 } },
    paused: { control: "boolean" },
  },
} satisfies Meta<typeof WaveAnimation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full bg-black overflow-hidden">
      <WaveAnimation position="absolute" zIndex={0} />
    </div>
  ),
};

export const PurplePalette: Story = {
  render: () => (
    <div className="relative h-[400px] w-full bg-background overflow-hidden">
      <WaveAnimation
        position="absolute"
        zIndex={0}
        palette={["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"]}
        speed={1.5}
        barCount={30}
      />
    </div>
  ),
};

export const SlowWide: Story = {
  render: () => (
    <div className="relative h-[400px] w-full bg-black overflow-hidden">
      <WaveAnimation
        position="absolute"
        zIndex={0}
        barCount={10}
        barWidth={200}
        speed={0.5}
        amplitude={1.5}
        trailOpacity={0.05}
      />
    </div>
  ),
};
