import type { Meta, StoryObj } from "@storybook/react";
import { CosmicSpectrum } from "./cosmic-spectrum";

const meta: Meta<typeof CosmicSpectrum> = {
  title: "Marketing/CosmicSpectrum",
  component: CosmicSpectrum,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof CosmicSpectrum>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const WithCopy: Story = {
  args: {
    title: "Built for the long run",
    subtitle: "Infrastructure that outlives its first architecture.",
    scrollHint: "Scroll to explore",
  },
};

export const Blurred: Story = { args: { blur: true } };
