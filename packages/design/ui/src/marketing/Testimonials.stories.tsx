import type { Meta, StoryObj } from "@storybook/react";
import { Testimonials } from "./Testimonials";

const meta: Meta<typeof Testimonials> = {
  title: "Marketing/Testimonials",
  component: Testimonials,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

const testimonials = [
  {
    id: "t1",
    quote:
      "We replaced four internal services with this in a week. The tenancy layer alone saved us a quarter.",
    author: { name: "Ariel Chen", title: "Platform lead", company: "Series B fintech" },
    rating: 5,
    featured: true,
  },
  {
    id: "t2",
    quote: "The provider switches are real. We moved billing without touching product code.",
    author: { name: "Dan Okafor", title: "Staff engineer", company: "Logistics SaaS" },
    rating: 5,
  },
  {
    id: "t3",
    quote:
      "Our procurement review asked for SSO, audit, and retention. All three were already there.",
    author: { name: "Mira Halvorsen", title: "CTO", company: "Healthtech" },
    rating: 4,
  },
];

type Story = StoryObj<typeof Testimonials>;

export const Carousel: Story = { args: { layout: "carousel", testimonials } };
export const Grid: Story = { args: { layout: "grid", testimonials } };
export const Masonry: Story = { args: { layout: "masonry", testimonials } };
export const Single: Story = { args: { layout: "single", testimonials } };
