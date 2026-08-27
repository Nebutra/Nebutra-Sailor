import type { Meta, StoryObj } from "@storybook/react";
import { AwardBadge } from "./award-badge";

const meta: Meta<typeof AwardBadge> = {
  title: "Marketing/AwardBadge",
  component: AwardBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AwardBadge>;

export const ProductOfTheDay: Story = { args: { type: "product-of-the-day", place: 1 } };
export const ProductOfTheWeek: Story = { args: { type: "product-of-the-week", place: 2 } };
export const ProductOfTheMonth: Story = { args: { type: "product-of-the-month", place: 3 } };
export const GoldenKitty: Story = { args: { type: "golden-kitty" } };
export const Linked: Story = { args: { type: "product-of-the-day", place: 1, link: "#" } };
