import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Marketing/Footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Footer>;

const sections = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API reference", href: "#" },
      { label: "Status", href: "#", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
];

const social = [
  { platform: "github" as const, href: "#" },
  { platform: "twitter" as const, href: "#" },
  { platform: "linkedin" as const, href: "#" },
];

export const Default: Story = { args: { sections, social } };

export const WithNewsletter: Story = { args: { sections, social, showNewsletter: true } };

/** Bare footer — no link columns, the state a fresh scaffold ships with. */
export const Minimal: Story = { args: {} };
