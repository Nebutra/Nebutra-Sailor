import type { Meta, StoryObj } from "@storybook/react";
import { DotPattern } from "./dot-pattern";

const meta = {
  title: "Primitives/DotPattern",
  component: DotPattern,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "SVG dot-grid background that fills its container. Supports static and animated (glow) modes, gradient masks, and custom spacing.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    glow: { control: "boolean" },
    width: { control: { type: "range", min: 8, max: 48, step: 4 } },
    height: { control: { type: "range", min: 8, max: 48, step: 4 } },
    cr: { control: { type: "range", min: 0.5, max: 4, step: 0.5 } },
  },
} satisfies Meta<typeof DotPattern>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DotPattern className="text-muted-foreground/30" />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold">Static Dot Pattern</h2>
      </div>
    </div>
  ),
};

export const Glowing: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden bg-background">
      <DotPattern glow className="text-primary/50" />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold">Glowing Dots</h2>
      </div>
    </div>
  ),
};

export const GradientMask: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DotPattern className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] text-foreground/30" />
      <div className="relative z-10 p-8">
        <h2 className="text-2xl font-bold">Gradient Masked</h2>
      </div>
    </div>
  ),
};

export const CustomSpacing: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DotPattern width={24} height={24} cr={2} className="text-blue-400/40" />
    </div>
  ),
};
