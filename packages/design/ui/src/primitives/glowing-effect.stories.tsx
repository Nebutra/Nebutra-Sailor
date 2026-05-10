import type { Meta, StoryObj } from "@storybook/react";
import { GlowingEffect } from "./glowing-effect";

const meta = {
  title: "Primitives/GlowingEffect",
  component: GlowingEffect,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Mouse-tracking glowing border that follows the cursor around an element. Adds premium interactivity to cards, buttons, and panels.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    glow: { control: "boolean" },
    variant: { control: "select", options: ["default", "white"] },
    spread: { control: { type: "range", min: 5, max: 60, step: 5 } },
    proximity: { control: { type: "range", min: 0, max: 100, step: 8 } },
  },
} satisfies Meta<typeof GlowingEffect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Move Mouse to See Effect",
  render: () => (
    <div className="relative rounded-xl border p-8 w-64">
      <GlowingEffect spread={40} glow={false} disabled={false} proximity={64} inactiveZone={0.7} />
      <div className="relative z-10 text-center">
        <p className="font-bold">Hover me</p>
        <p className="text-sm text-muted-foreground">Move mouse around the border</p>
      </div>
    </div>
  ),
};

export const AlwaysGlowing: Story = {
  render: () => (
    <div className="relative rounded-xl border p-8 w-64">
      <GlowingEffect glow={true} disabled={false} spread={30} />
      <div className="relative z-10 text-center">
        <p className="font-bold">Always Glowing</p>
      </div>
    </div>
  ),
};

export const WhiteVariant: Story = {
  render: () => (
    <div className="bg-card p-8 rounded-2xl">
      <div className="relative rounded-xl border border-white/20 bg-black p-8 w-64">
        <GlowingEffect variant="white" disabled={false} glow={false} spread={30} />
        <div className="relative z-10 text-center text-white">
          <p className="font-bold">White Variant</p>
          <p className="text-sm text-white/60">For dark backgrounds</p>
        </div>
      </div>
    </div>
  ),
};
