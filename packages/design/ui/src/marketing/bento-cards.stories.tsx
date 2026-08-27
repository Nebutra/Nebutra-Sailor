import type { Meta, StoryObj } from "@storybook/react";
import { BentoCards } from "./bento-cards";

const meta: Meta<typeof BentoCards> = {
  title: "Marketing/BentoCards",
  component: BentoCards,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof BentoCards>;

const cards = [
  { title: "Multi-tenancy", description: "Tenant context, RLS, and schema isolation.", colSpan: 4 },
  { title: "Billing", description: "Four providers, one interface.", colSpan: 2 },
  { title: "Queues", description: "Serverless or self-hosted.", colSpan: 2 },
  { title: "Search", description: "Meilisearch, Typesense, Algolia.", colSpan: 2 },
  { title: "Audit", description: "Attributable writes, SOC 2 ready.", colSpan: 2, href: "#" },
];

export const Default: Story = { args: { cards } };

export const WithFooter: Story = {
  args: {
    cards,
    footerHeadline: "And the parts you have not thought about yet",
    footerDescription: "Vault, metering, webhooks, notifications — same contract shape.",
  },
};

export const Borderless: Story = { args: { cards, showBorder: false } };
