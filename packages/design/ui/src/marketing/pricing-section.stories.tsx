import type { Meta, StoryObj } from "@storybook/react";
import { PricingSection } from "./pricing-section";

const meta: Meta<typeof PricingSection> = {
  title: "Marketing/PricingSection",
  component: PricingSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof PricingSection>;

const plans = [
  {
    name: "Free",
    info: "For evaluating the stack",
    price: { monthly: 0, yearly: 0 },
    features: [{ text: "1 workspace" }, { text: "Community support" }],
    btn: { text: "Start free", href: "#" },
  },
  {
    name: "Pro",
    info: "For teams shipping to production",
    price: { monthly: 29, yearly: 290 },
    features: [
      { text: "Unlimited workspaces" },
      { text: "Audit log", tooltip: "Retained for 90 days" },
      { text: "Priority support" },
    ],
    btn: { text: "Upgrade", href: "#" },
    highlighted: true,
  },
  {
    name: "Enterprise",
    info: "For procurement reviews",
    price: { monthly: 99, yearly: 990 },
    features: [{ text: "SSO + SCIM" }, { text: "Custom retention" }, { text: "SLA" }],
    btn: { text: "Contact sales", href: "#" },
  },
];

export const Default: Story = { args: { heading: "Pricing", plans } };

export const WithDescription: Story = {
  args: {
    heading: "Pricing",
    description: "Every plan includes the full platform. You pay for scale, not for features.",
    plans,
  },
};

/** Two plans — checks the grid does not assume three. */
export const TwoPlans: Story = { args: { heading: "Pricing", plans: plans.slice(0, 2) } };
