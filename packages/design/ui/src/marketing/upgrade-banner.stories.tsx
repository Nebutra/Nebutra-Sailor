import type { Meta, StoryObj } from "@storybook/react";
import { UpgradeBanner } from "./upgrade-banner";

const meta: Meta<typeof UpgradeBanner> = {
  title: "Marketing/UpgradeBanner",
  component: UpgradeBanner,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof UpgradeBanner>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const CustomCopy: Story = {
  args: { description: "You are close to your monthly quota.", buttonText: "Upgrade plan" },
};
