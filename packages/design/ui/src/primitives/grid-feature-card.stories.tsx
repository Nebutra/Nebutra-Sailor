import type { Meta, StoryObj } from "@storybook/react";
import { Code, Globe, Lock, Shield, Sparkles, Zap } from "lucide-react";
import { GridFeatureCard } from "./grid-feature-card";

const meta = {
  title: "Primitives/GridFeatureCard",
  component: GridFeatureCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Feature card with a randomly-generated decorative SVG grid pattern overlay. Pattern randomizes on each mount. Uses mask-image for a gradient fade.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    gridSize: { control: { type: "range", min: 8, max: 40, step: 4 } },
  },
} satisfies Meta<typeof GridFeatureCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <GridFeatureCard
      icon={Sparkles}
      title="AI Native"
      description="Built-in intelligence that learns from your team's patterns and workflow."
      className="w-64 border rounded-lg"
    />
  ),
};

export const FeatureGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 border w-[600px]">
      <GridFeatureCard
        icon={Sparkles}
        title="AI Native"
        description="Built-in intelligence that learns from your team's patterns."
      />
      <GridFeatureCard
        icon={Shield}
        title="Enterprise Security"
        description="Zero-trust architecture with SOC 2 Type II certification."
      />
      <GridFeatureCard
        icon={Globe}
        title="Global Scale"
        description="Deploy to 35+ regions with automatic failover built-in."
      />
      <GridFeatureCard
        icon={Zap}
        title="Lightning Fast"
        description="Sub-second latency across all global edge locations."
      />
      <GridFeatureCard
        icon={Code}
        title="Developer First"
        description="Comprehensive APIs and SDKs for every major platform."
      />
      <GridFeatureCard
        icon={Lock}
        title="Compliance Ready"
        description="GDPR, HIPAA, and SOC 2 compliance out of the box."
      />
    </div>
  ),
};

export const SmallGrid: Story = {
  render: () => (
    <GridFeatureCard
      icon={Code}
      title="Developer First"
      description="Comprehensive APIs and SDKs."
      gridSize={10}
      className="w-64 border rounded-lg"
    />
  ),
};
