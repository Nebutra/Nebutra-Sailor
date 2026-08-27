import type { Meta, StoryObj } from "@storybook/react";
import { FeaturesGrid } from "./features-grid";

const meta: Meta<typeof FeaturesGrid> = {
  title: "Marketing/FeaturesGrid",
  component: FeaturesGrid,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeaturesGrid>;

const features = [
  { title: "Multi-tenancy", description: "Request-scoped tenant context with row-level security." },
  { title: "Billing", description: "Stripe, Polar, and LemonSqueezy behind one interface." },
  { title: "Auth", description: "Clerk, Better Auth, or NextAuth — chosen by config." },
  { title: "Queues", description: "QStash in serverless, BullMQ when you self-host." },
  { title: "Search", description: "Meilisearch, Typesense, or Algolia." },
  { title: "Audit", description: "SOC 2-grade trail for every privileged write." },
];

export const Default: Story = { args: { features } };

/** Fewer items — checks the grid does not stretch its cells. */
export const Sparse: Story = { args: { features: features.slice(0, 2) } };
