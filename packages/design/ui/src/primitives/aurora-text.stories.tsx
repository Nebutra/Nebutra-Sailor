import type { Meta, StoryObj } from "@storybook/react";
import { AuroraText } from "./aurora-text";

const meta = {
  title: "Primitives/AuroraText",
  component: AuroraText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated aurora borealis gradient text. Colors shift and rotate continuously — ideal for hero headlines and brand accents.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    speed: {
      control: { type: "range", min: 0.5, max: 5, step: 0.5 },
      description: "Animation speed multiplier",
    },
    colors: {
      control: "object",
      description: "Array of gradient color stops",
    },
  },
} satisfies Meta<typeof AuroraText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Aurora Text",
    className: "text-5xl font-bold",
  },
};

export const HeroHeadline: Story = {
  name: "In Hero Heading",
  render: () => (
    <h1 className="text-5xl font-bold">
      Build <AuroraText>beautiful</AuroraText> apps
    </h1>
  ),
};

export const OceanColors: Story = {
  args: {
    children: "Ocean Gradient",
    colors: ["#00ff87", "#60efff", "#0061ff"],
    className: "text-5xl font-bold",
  },
};

export const FastAurora: Story = {
  args: {
    children: "Fast Aurora",
    speed: 3,
    className: "text-5xl font-black",
  },
};

export const SunsetColors: Story = {
  args: {
    children: "Sunset",
    colors: ["#f97316", "#ec4899", "#a855f7"],
    className: "text-6xl font-black",
  },
};
