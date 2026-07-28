import type { Meta, StoryObj } from "@storybook/react";
import { StaggerTestimonials } from "./stagger-testimonials";

const meta: Meta<typeof StaggerTestimonials> = {
  title: "Marketing/StaggerTestimonials",
  component: StaggerTestimonials,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof StaggerTestimonials>;

/** Shipped defaults — every prop is optional. */
export const Default: Story = { args: {} };

export const Taller: Story = { args: { height: 620 } };
