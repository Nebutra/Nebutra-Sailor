import type { Meta, StoryObj } from "@storybook/react";
import { UseCases } from "./UseCases";

const meta: Meta<typeof UseCases> = {
  title: "Marketing/UseCases",
  component: UseCases,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof UseCases>;

export const Tabs: Story = { args: { layout: "tabs" } };
export const Carousel: Story = { args: { layout: "carousel" } };
export const Grid: Story = { args: { layout: "grid" } };
export const Cards: Story = { args: { layout: "cards" } };
