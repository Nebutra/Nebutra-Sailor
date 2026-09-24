import type { Meta, StoryObj } from "@storybook/react";
import { UpgradeBanner } from "./upgrade-banner";

const meta: Meta<typeof UpgradeBanner> = {
  title: "Primitives/UpgradeBanner",
  component: UpgradeBanner,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Inline upsell primitive — shows value without blocking the workflow. " +
          "Pair with FeatureGate fallback for declarative plan-gated UI.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof UpgradeBanner>;

export const Inline: Story = {
  args: {
    feature: "Custom workflows",
    description: "Automate the handoffs your team does by hand today.",
    ctaLabel: "Upgrade",
  },
};

export const Card: Story = {
  args: {
    ...Inline.args,
    variant: "card",
    dismissible: true,
  },
};

export const Dismissible: Story = {
  args: {
    ...Inline.args,
    dismissible: true,
  },
};

export const CustomTitle: Story = {
  args: {
    title: "Advanced analytics is a Pro feature",
    description: "Cohorts, retention and funnels are included from Pro.",
    ctaLabel: "See plans",
  },
};
