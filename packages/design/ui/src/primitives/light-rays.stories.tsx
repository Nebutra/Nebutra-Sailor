import type { Meta, StoryObj } from "@storybook/react";
import { LightRays } from "./light-rays";

const meta = {
  title: "Primitives/LightRays",
  component: LightRays,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Atmospheric animated light rays shining from above a container. Creates a dramatic, cinematic lighting effect for hero sections and featured cards.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    count: { control: { type: "range", min: 1, max: 20, step: 1 } },
    blur: { control: { type: "range", min: 10, max: 80, step: 4 } },
    speed: { control: { type: "range", min: 5, max: 30, step: 1 } },
    color: { control: "color" },
  },
} satisfies Meta<typeof LightRays>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl border bg-background">
      <LightRays />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold text-white">Light Rays</h2>
      </div>
    </div>
  ),
};

export const GoldenRays: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl bg-black">
      <LightRays count={10} color="rgba(255, 200, 100, 0.35)" blur={48} speed={18} length="80vh" />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold text-amber-200">Golden Rays</h2>
      </div>
    </div>
  ),
};

export const SubtleAmbient: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl bg-muted">
      <LightRays count={5} color="rgba(99, 102, 241, 0.15)" blur={60} speed={22} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold">Subtle Ambient</h2>
      </div>
    </div>
  ),
};
