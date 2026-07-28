import type { Meta, StoryObj } from "@storybook/react";
import { Pricing } from "./Pricing";

const meta: Meta<typeof Pricing> = {
  title: "Marketing/Pricing",
  component: Pricing,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Pricing>;

export const Monthly: Story = { args: { defaultBillingCycle: "monthly" } };
export const Yearly: Story = { args: { defaultBillingCycle: "yearly" } };
