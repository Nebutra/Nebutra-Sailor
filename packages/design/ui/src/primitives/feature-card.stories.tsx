import type { Meta, StoryObj } from "@storybook/react";
import { Globe, Layers, MapPin, Shield, Zap } from "lucide-react";
import { CircularUI, FeatureCard, FeatureCardContent, FeatureCardHeader } from "./feature-card";

const meta = {
  title: "Primitives/FeatureCard",
  component: FeatureCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card with decorative corner bracket decorators. Composed of FeatureCard, FeatureCardHeader (icon + title + description), and FeatureCardContent. Also exports DualModeImage and CircularUI.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FeatureCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FeatureCard className="w-80">
      <FeatureCardHeader
        icon={MapPin}
        title="Real-time tracking"
        description="Know where your team is at all times."
      />
      <FeatureCardContent className="p-6">
        <div className="h-32 rounded bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
          Map visualization
        </div>
      </FeatureCardContent>
    </FeatureCard>
  ),
};

export const FeatureGrid: Story = {
  render: () => (
    <div className="grid grid-cols-3 border w-[720px]">
      <FeatureCard>
        <FeatureCardHeader
          icon={Zap}
          title="Lightning fast"
          description="Sub-second response times worldwide."
        />
        <FeatureCardContent className="p-6">
          <div className="h-24 rounded bg-muted/20" />
        </FeatureCardContent>
      </FeatureCard>
      <FeatureCard>
        <FeatureCardHeader
          icon={Shield}
          title="Enterprise security"
          description="SOC 2 certified, zero-trust architecture."
        />
        <FeatureCardContent className="p-6">
          <div className="h-24 rounded bg-muted/20" />
        </FeatureCardContent>
      </FeatureCard>
      <FeatureCard>
        <FeatureCardHeader
          icon={Globe}
          title="Global reach"
          description="Deploy in 35+ regions with one click."
        />
        <FeatureCardContent className="p-6">
          <div className="h-24 rounded bg-muted/20" />
        </FeatureCardContent>
      </FeatureCard>
    </div>
  ),
};

export const WithCircularUI: Story = {
  render: () => (
    <FeatureCard className="w-72">
      <FeatureCardHeader
        icon={Layers}
        title="Flexible permissions"
        description="Fine-grained role-based access control."
      />
      <FeatureCardContent className="flex gap-6 p-6 pb-8">
        <CircularUI label="Admins" circles={[{ pattern: "primary" }, { pattern: "border" }]} />
        <CircularUI label="Members" circles={[{ pattern: "border" }, { pattern: "none" }]} />
        <CircularUI label="Guests" circles={[{ pattern: "blue" }, { pattern: "none" }]} />
      </FeatureCardContent>
    </FeatureCard>
  ),
};
