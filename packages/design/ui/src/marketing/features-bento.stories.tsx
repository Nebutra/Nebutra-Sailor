import { ChartActivity, Layers, LockClosed, Servers } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { FeaturesBentoSection } from "./features-bento";

const meta: Meta<typeof FeaturesBentoSection> = {
  title: "Marketing/FeaturesBentoSection",
  component: FeaturesBentoSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeaturesBentoSection>;

/** Shipped defaults — the arrangement a landing page gets for free. */
export const Default: Story = { args: {} };

export const Customized: Story = {
  args: {
    statCard: { value: "99.99%", title: "Origin availability, trailing 90 days" },
    securityCard: {
      title: "Security that survives an audit",
      description: "Envelope encryption, scoped audit trail, least-privilege by default.",
    },
    performanceCard: {
      title: "Fast where it counts",
      description: "Edge routing in front of one origin of truth — no read replicas to reconcile.",
    },
    leftFeatureCard: {
      icon: LockClosed,
      title: "Tenant isolation",
      description: "Row-level security on every table, enforced by the database.",
    },
    rightFeatureCard: {
      icon: Servers,
      title: "Portable runtime",
      description: "Vercel, Cloudflare Workers, or your own origin — one config switch.",
    },
  },
};

/** Icon-led cards only, for a denser section. */
export const FeatureCardsOnly: Story = {
  args: {
    leftFeatureCard: {
      icon: Layers,
      title: "Composable",
      description: "Every layer swaps without a rewrite.",
    },
    rightFeatureCard: {
      icon: ChartActivity,
      title: "Metered",
      description: "Usage aggregated in real time.",
    },
  },
};
