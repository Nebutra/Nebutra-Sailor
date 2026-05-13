import type { Meta, StoryObj } from "@storybook/react";
import { AuroraBackground } from "./aurora-background";

const meta = {
  title: "Primitives/AuroraBackground",
  component: AuroraBackground,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Ambient aurora halo backdrop for marketing sections. Replaces the legacy single-blob `blur-[120px]` pattern with a low-saturation multi-stop radial-gradient mesh plus optional fractal-noise grain. Server Component compatible.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["subtle", "vivid", "monochrome"],
    },
    position: {
      control: "inline-radio",
      options: ["top", "center", "bottom"],
    },
    intensity: {
      control: { type: "range", min: 0, max: 1, step: 0.05 },
    },
    noise: { control: "boolean" },
  },
} satisfies Meta<typeof AuroraBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div
    className="relative overflow-hidden rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-1)]"
    style={{ width: 800, height: 400 }}
  >
    {children}
    <div className="relative z-10 flex h-full w-full items-center justify-center">
      <span className="text-2xl font-semibold text-[var(--neutral-12)]">{label}</span>
    </div>
  </div>
);

export const Subtle: Story = {
  args: { variant: "subtle", position: "center", intensity: 0.5, noise: true },
  render: (args) => (
    <Frame label="Subtle">
      <AuroraBackground {...args} />
    </Frame>
  ),
};

export const Vivid: Story = {
  args: { variant: "vivid", position: "top", intensity: 0.6, noise: true },
  render: (args) => (
    <Frame label="Vivid (hero)">
      <AuroraBackground {...args} />
    </Frame>
  ),
};

export const Monochrome: Story = {
  args: {
    variant: "monochrome",
    position: "bottom",
    intensity: 0.5,
    noise: true,
  },
  render: (args) => (
    <Frame label="Monochrome (pricing)">
      <AuroraBackground {...args} />
    </Frame>
  ),
};
