import type { Meta, StoryObj } from "@storybook/react";
import { Testimonials } from "./Testimonials";

const meta: Meta<typeof Testimonials> = {
  title: "Marketing/Testimonials",
  component: Testimonials,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Testimonials>;

export const Carousel: Story = { args: { layout: "carousel" } };
export const Grid: Story = { args: { layout: "grid" } };
export const Masonry: Story = { args: { layout: "masonry" } };
export const Single: Story = { args: { layout: "single" } };
