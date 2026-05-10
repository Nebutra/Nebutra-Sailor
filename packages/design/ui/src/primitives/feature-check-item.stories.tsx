import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles, Star } from "lucide-react";
import { FeatureCheckItem } from "./feature-check-item";

const meta = {
  title: "Primitives/FeatureCheckItem",
  component: FeatureCheckItem,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Atomic feature list item with a check icon (or custom icon), title, and optional description. Defaults to the Lucide Check icon.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FeatureCheckItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FeatureCheckItem
      title="Unlimited team members"
      description="Invite your entire organization at no extra cost."
    />
  ),
};

export const FeatureList: Story = {
  render: () => (
    <div className="space-y-4 w-72">
      {[
        {
          title: "Unlimited team members",
          description: "Scale without per-seat pricing.",
        },
        {
          title: "99.99% uptime SLA",
          description: "Backed by financial guarantees.",
        },
        {
          title: "SOC 2 Type II certified",
          description: "Enterprise security by default.",
        },
        {
          title: "24/7 priority support",
          description: "Dedicated support channel.",
        },
        {
          title: "Custom integrations",
          description: "Connect any tool via API or Zapier.",
        },
      ].map((f) => (
        <FeatureCheckItem key={f.title} title={f.title} description={f.description} />
      ))}
    </div>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 w-80">
      {[
        "Custom domains",
        "API access",
        "SSO / SAML",
        "Audit logs",
        "Data export",
        "Priority support",
      ].map((title) => (
        <FeatureCheckItem key={title} title={title} />
      ))}
    </div>
  ),
};

export const CustomIcon: Story = {
  render: () => (
    <div className="space-y-3 w-72">
      <FeatureCheckItem
        icon={Star}
        iconClassName="text-yellow-500"
        title="Featured"
        description="Top-rated by enterprise customers."
      />
      <FeatureCheckItem
        icon={Sparkles}
        iconClassName="text-purple-500"
        title="AI-powered"
        description="Context-aware suggestions for your workflow."
      />
    </div>
  ),
};
