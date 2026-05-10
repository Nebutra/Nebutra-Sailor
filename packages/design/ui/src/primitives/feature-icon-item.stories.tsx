import type { Meta, StoryObj } from "@storybook/react";
import { BarChart, Globe, Lock, Shield, Sparkles, Zap } from "lucide-react";
import { FeatureIconItem } from "./feature-icon-item";

const meta = {
  title: "Primitives/FeatureIconItem",
  component: FeatureIconItem,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Atomic feature item with an icon inline with the title, plus optional description. Requires an explicit icon prop (no default).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FeatureIconItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FeatureIconItem
      icon={Zap}
      title="Lightning fast"
      description="Sub-second response times across 35+ global edge locations."
    />
  ),
};

export const FeatureGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 w-96">
      <FeatureIconItem icon={Zap} title="Fast" description="Optimized for low latency." />
      <FeatureIconItem icon={Shield} title="Secure" description="Zero-trust architecture." />
      <FeatureIconItem icon={Globe} title="Global" description="35+ edge locations." />
      <FeatureIconItem icon={Sparkles} title="AI-ready" description="Built-in intelligence." />
      <FeatureIconItem icon={Lock} title="Compliant" description="SOC 2 + GDPR certified." />
      <FeatureIconItem icon={BarChart} title="Analytics" description="Real-time dashboards." />
    </div>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <div className="space-y-2 w-48">
      <FeatureIconItem icon={Zap} title="Fast" />
      <FeatureIconItem icon={Shield} title="Secure" />
      <FeatureIconItem icon={Globe} title="Global" />
    </div>
  ),
};

export const ColoredIcon: Story = {
  render: () => (
    <FeatureIconItem
      icon={Sparkles}
      iconClassName="text-yellow-500"
      title="AI-powered"
      description="Context-aware recommendations."
    />
  ),
};
