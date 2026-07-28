import type { Meta, StoryObj } from "@storybook/react";
import { FAQ } from "./FAQ";

const meta: Meta<typeof FAQ> = {
  title: "Marketing/FAQ",
  component: FAQ,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FAQ>;

export const Accordion: Story = { args: { layout: "accordion" } };
export const TwoColumn: Story = { args: { layout: "two-column" } };
export const Cards: Story = { args: { layout: "cards" } };
