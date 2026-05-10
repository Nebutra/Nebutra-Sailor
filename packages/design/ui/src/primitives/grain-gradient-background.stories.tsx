import type { Meta, StoryObj } from "@storybook/react";
import { GrainGradientBackground } from "./grain-gradient-background";

const meta = {
  title: "Primitives/GrainGradientBackground",
  component: GrainGradientBackground,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "WebGL-powered animated grain gradient background using @paper-design/shaders-react. Renders as `absolute inset-0 -z-10` by default — place inside a `relative` container.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GrainGradientBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <GrainGradientBackground />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-lg font-semibold text-white drop-shadow">Default grain gradient</p>
      </div>
    </div>
  ),
};

export const PurpleNeon: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <GrainGradientBackground
        colors={["#5100ff", "#a855f7", "#ec4899"]}
        softness={0.8}
        noise={0.15}
        speed={0.5}
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2">
        <p className="text-3xl font-bold text-white drop-shadow">Purple Neon</p>
        <p className="text-white/70 text-sm">colors + softness + noise</p>
      </div>
    </div>
  ),
};

export const OceanSunrise: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <GrainGradientBackground
        colors={["#0ea5e9", "#06b6d4", "#f59e0b"]}
        softness={0.6}
        noise={0.08}
        speed={0.3}
      />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-2xl font-semibold text-white drop-shadow">Ocean Sunrise</p>
      </div>
    </div>
  ),
};

export const EarthTones: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <GrainGradientBackground
        colors={["#78350f", "#d97706", "#fef3c7"]}
        softness={0.5}
        noise={0.2}
        speed={0.2}
      />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-2xl font-semibold text-amber-100 drop-shadow">Earth Tones</p>
      </div>
    </div>
  ),
};

export const SlowAndSoft: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <GrainGradientBackground
        colors={["#ddd6fe", "#e9d5ff", "#fbcfe8"]}
        softness={1}
        noise={0.05}
        speed={0.1}
      />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="text-2xl font-semibold text-violet-900">Soft Pastel</p>
      </div>
    </div>
  ),
};
