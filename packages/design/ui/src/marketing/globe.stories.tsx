import type { Meta, StoryObj } from "@storybook/react";
import { Globe } from "./globe";

const meta: Meta<typeof Globe> = {
  title: "Marketing/Globe",
  component: Globe,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Globe>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const WithCopy: Story = {
  args: {
    headline: "Deployed where your users are",
    description: "Edge routing in front of a single origin of truth.",
  },
};
