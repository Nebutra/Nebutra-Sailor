import type { Meta, StoryObj } from "@storybook/react";
import { SocialProof } from "./SocialProof";

const meta: Meta<typeof SocialProof> = {
  title: "Marketing/SocialProof",
  component: SocialProof,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SocialProof>;

export const Combined: Story = { args: { variant: "combined" } };
export const LogosOnly: Story = { args: { variant: "logos-only" } };
export const StatsOnly: Story = { args: { variant: "stats-only" } };
