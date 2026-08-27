import type { Meta, StoryObj } from "@storybook/react";
import CTAWithVerticalMarquee from "./cta-with-text-marquee";

const meta: Meta<typeof CTAWithVerticalMarquee> = {
  title: "Marketing/CTAWithVerticalMarquee",
  component: CTAWithVerticalMarquee,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof CTAWithVerticalMarquee>;

export const Default: Story = { args: {} };

export const WithCopy: Story = {
  args: {
    title: "Stop rebuilding the same four services",
    description: "Auth, billing, tenancy, and queues arrive wired together. You bring the product.",
    primaryButtonText: "Start building",
    primaryHref: "#",
    secondaryButtonText: "Read the architecture",
    secondaryHref: "#",
  },
};
