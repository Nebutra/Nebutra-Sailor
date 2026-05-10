import type { Meta, StoryObj } from "@storybook/react";
import { BarChart, Code, Globe, Lock, Sparkles, Zap } from "lucide-react";
import { BentoCard, BentoGrid } from "./bento-grid";

const meta = {
  title: "Primitives/BentoGrid",
  component: BentoGrid,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Responsive bento-style grid container with BentoCard items. Cards have background slots, icons, and hover-reveal CTAs. On desktop, the CTA slides up on hover.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BentoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <BentoGrid>
      <BentoCard
        name="AI-powered"
        description="Built-in intelligence that learns from your workflow and makes smarter suggestions over time."
        Icon={Sparkles}
        className="lg:col-span-2"
        href="/"
        cta="Explore AI features"
      />
      <BentoCard
        name="Lightning fast"
        description="Sub-second response times, globally distributed across 35+ regions."
        Icon={Zap}
        href="/"
        cta="See benchmarks"
      />
      <BentoCard
        name="Enterprise security"
        description="SOC 2 Type II certified. GDPR and HIPAA compliant out of the box."
        Icon={Lock}
        href="/"
        cta="View compliance"
      />
      <BentoCard
        name="Global reach"
        description="Deploy anywhere. Serve everyone. One platform, worldwide coverage."
        Icon={Globe}
        className="lg:col-span-2"
        href="/"
        cta="See regions"
      />
    </BentoGrid>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <BentoGrid className="lg:grid-cols-2">
      <BentoCard
        name="Analytics"
        description="Real-time insights into your product usage and growth metrics."
        Icon={BarChart}
        background={
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
        }
        href="/"
        cta="View analytics"
      />
      <BentoCard
        name="Developer API"
        description="Comprehensive REST and GraphQL APIs with SDKs for all major platforms."
        Icon={Code}
        background={
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-teal-500/20" />
        }
        href="/"
        cta="Read docs"
      />
    </BentoGrid>
  ),
};

export const SingleColumn: Story = {
  render: () => (
    <BentoGrid className="grid-cols-1 auto-rows-[14rem]">
      <BentoCard
        name="Feature One"
        description="Comprehensive first feature description."
        Icon={Sparkles}
        href="/"
      />
      <BentoCard
        name="Feature Two"
        description="Comprehensive second feature description."
        Icon={Zap}
        href="/"
      />
    </BentoGrid>
  ),
};
