import type { Meta, StoryObj } from "@storybook/react";
import { BarChart, Globe, Shield, Zap } from "lucide-react";
import { FeatureArrowCard } from "./feature-arrow-card";

const meta = {
  title: "Primitives/FeatureArrowCard",
  component: FeatureArrowCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Feature card with icon, title, subtitle, description, optional card content slot, and a rotating arrow button. Arrow rotates -45deg on hover.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FeatureArrowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <FeatureArrowCard
        icon={Zap}
        title="Performance"
        subtitle="Sub-second response times"
        description="across 35+ global edge locations"
        onArrowClick={() => alert("Navigate to performance")}
      />
    </div>
  ),
};

export const WithCardContent: Story = {
  render: () => (
    <div className="w-80">
      <FeatureArrowCard
        icon={BarChart}
        title="Analytics"
        subtitle="Real-time insights"
        description="into your product usage and growth metrics"
        cardContent={
          <div className="h-full w-full bg-gradient-to-br from-blue-500/30 to-purple-500/30" />
        }
        onArrowClick={() => alert("Navigate to analytics")}
      />
    </div>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[640px]">
      <FeatureArrowCard
        icon={Zap}
        title="Performance"
        subtitle="Lightning fast"
        description="zero-latency global infrastructure"
        onArrowClick={() => {}}
      />
      <FeatureArrowCard
        icon={Shield}
        title="Security"
        subtitle="Enterprise-grade"
        description="SOC 2 certified, zero-trust architecture"
        onArrowClick={() => {}}
      />
      <FeatureArrowCard
        icon={Globe}
        title="Global"
        subtitle="35+ regions"
        description="automatic failover and edge caching"
        onArrowClick={() => {}}
      />
      <FeatureArrowCard
        icon={BarChart}
        title="Analytics"
        subtitle="Real-time data"
        description="insights for every interaction"
        onArrowClick={() => {}}
      />
    </div>
  ),
};
