import type { Meta, StoryObj } from "@storybook/react";
import { CTASection } from "./cta-section";

const meta: Meta<typeof CTASection> = {
  title: "Marketing/CTASection",
  component: CTASection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof CTASection>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const WithBothActions: Story = {
  args: {
    headline: "Start with the boring parts already done",
    description: "Auth, billing, and tenancy are wired before you write a feature.",
    primaryButtonText: "Get started",
    secondaryButtonText: "Read the docs",
    showArrow: true,
  },
};
