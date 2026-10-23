import type { Meta, StoryObj } from "@storybook/react";
import { HexGrid } from "./hex-grid";

const meta = {
  title: "Primitives/HexGrid",
  component: HexGrid,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Hexagonal tessellation background drawn from the Nebutra mark. Place it in a relatively positioned, overflow-hidden container. `glow` pulses individual cells, so leave it off where motion is unwanted.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "range", min: 12, max: 64, step: 2 } },
    opacity: { control: { type: "range", min: 0.02, max: 0.6, step: 0.02 } },
    strokeWidth: { control: { type: "range", min: 0.5, max: 4, step: 0.5 } },
    glow: { control: "boolean" },
    filled: { control: "boolean" },
  },
  args: { size: 24, opacity: 0.2 },
  decorators: [
    (Story) => (
      <div className="relative h-72 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HexGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Glow: Story = { args: { glow: true, opacity: 0.15 } };

export const FilledMasked: Story = {
  args: {
    filled: true,
    size: 32,
    opacity: 0.12,
    className: "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
  },
};

export const Dense: Story = { args: { size: 14, strokeWidth: 0.5 } };
