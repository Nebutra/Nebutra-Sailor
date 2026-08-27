import { ChartActivity, Layers, LockClosed, Servers } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { FeaturesShowcase } from "./features-showcase";

const meta: Meta<typeof FeaturesShowcase> = {
  title: "Marketing/FeaturesShowcase",
  component: FeaturesShowcase,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeaturesShowcase>;

const features = [
  { icon: Layers, title: "Composable", description: "Every layer swaps without a rewrite." },
  { icon: LockClosed, title: "Tenant-safe", description: "Row-level security on every table." },
  { icon: Servers, title: "Portable", description: "Vercel, Workers, or your own origin." },
  { icon: ChartActivity, title: "Metered", description: "Usage aggregated in real time." },
];

export const Default: Story = {
  args: {
    title: "One platform, every surface",
    description: "The primitives behind the dashboard, the docs, and the marketing site.",
    features,
  },
};

/** Title only — the minimum the component accepts. */
export const TitleOnly: Story = {
  args: { title: "Built to be replaced, part by part", features: features.slice(0, 2) },
};
