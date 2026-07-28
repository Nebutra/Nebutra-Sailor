import type { Meta, StoryObj } from "@storybook/react";
import { FAQBlock } from "./faq-block";

const meta: Meta<typeof FAQBlock> = {
  title: "Marketing/FAQBlock",
  component: FAQBlock,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FAQBlock>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const WithSearch: Story = { args: { showSearch: true } };

export const FullFeatured: Story = {
  args: { showSearch: true, showFeedback: true, showSuggestions: true },
};
