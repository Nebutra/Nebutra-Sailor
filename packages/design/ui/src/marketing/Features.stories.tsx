import type { Meta, StoryObj } from "@storybook/react";
import { Features } from "./Features";

const meta: Meta<typeof Features> = {
  title: "Marketing/Features",
  component: Features,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

const features = [
  {
    id: "tenancy",
    title: "Multi-tenancy",
    description: "Request-scoped tenant context with row-level security on every table.",
  },
  {
    id: "billing",
    title: "Billing",
    description: "Stripe, Polar, and LemonSqueezy behind one provider-agnostic interface.",
  },
  {
    id: "auth",
    title: "Auth",
    description: "Clerk, Better Auth, or NextAuth — selected by config, not by a rewrite.",
  },
  {
    id: "queues",
    title: "Queues",
    description: "QStash when you are serverless, BullMQ when you self-host.",
    badge: "New",
  },
  {
    id: "search",
    title: "Search",
    description: "Meilisearch, Typesense, or Algolia against the same index contract.",
  },
  {
    id: "audit",
    title: "Audit",
    description: "An attributable trail for every privileged write, ready for review.",
  },
];

type Story = StoryObj<typeof Features>;

export const Grid: Story = { args: { layout: "grid", features } };
export const Bento: Story = { args: { layout: "bento", features } };
export const Alternating: Story = { args: { layout: "alternating", features } };
export const Tabs: Story = { args: { layout: "tabs", features } };

/** Column count only applies to the grid layout. */
export const FourColumns: Story = { args: { layout: "grid", columns: 4, features } };
