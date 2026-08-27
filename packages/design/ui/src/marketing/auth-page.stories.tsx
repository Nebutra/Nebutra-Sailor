import type { Meta, StoryObj } from "@storybook/react";
import { AuthPage } from "./auth-page";

const meta: Meta<typeof AuthPage> = {
  title: "Marketing/AuthPage",
  component: AuthPage,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof AuthPage>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const Branded: Story = {
  args: {
    brandName: "Nebutra",
    title: "Welcome back",
    subtitle: "Sign in to your workspace.",
    testimonialQuote: "We replaced four internal services with this in a week.",
    testimonialAuthor: "Platform lead, Series B fintech",
  },
};
