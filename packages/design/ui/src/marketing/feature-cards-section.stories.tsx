import { Layers, LockClosed, Servers } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { FeatureCardsSection } from "./feature-cards-section";

const meta: Meta<typeof FeatureCardsSection> = {
  title: "Marketing/FeatureCardsSection",
  component: FeatureCardsSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeatureCardsSection>;

const cards = [
  { icon: Layers, title: "Composable", description: "Every layer swaps without a rewrite." },
  { icon: LockClosed, title: "Tenant-safe", description: "Row-level security on every table." },
  { icon: Servers, title: "Portable", description: "Vercel, Workers, or your own origin." },
];

export const Default: Story = { args: { cards } };

/** Description-only cards — icon and title are both optional. */
export const DescriptionOnly: Story = {
  args: { cards: [{ description: "One idea per card, no chrome." }] },
};
