import type { Meta, StoryObj } from "@storybook/react";
import { FeatureCarousel } from "./feature-carousel";

const meta: Meta<typeof FeatureCarousel> = {
  title: "Marketing/FeatureCarousel",
  component: FeatureCarousel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeatureCarousel>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const WithCopy: Story = {
  args: {
    badge: "What is new",
    headline: "One surface at a time",
    description: "Each slide is an independently shippable capability.",
  },
};
