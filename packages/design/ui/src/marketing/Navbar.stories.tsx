import type { Meta, StoryObj } from "@storybook/react";
import { Navbar } from "./Navbar";

const meta: Meta<typeof Navbar> = {
  title: "Marketing/Navbar",
  component: Navbar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Marketing site header. Links accept one level of `children` for dropdowns and an optional `badge` for new or beta surfaces.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Navbar>;

const links = [
  { label: "Product", href: "#" },
  {
    label: "Solutions",
    href: "#",
    children: [
      { label: "For startups", href: "#" },
      { label: "For enterprise", href: "#" },
    ],
  },
  { label: "Pricing", href: "#" },
  { label: "Changelog", href: "#", badge: "New" },
  { label: "Docs", href: "#", external: true },
];

export const Default: Story = { args: { links } };

export const WithAnnouncement: Story = {
  args: {
    links,
    showAnnouncement: true,
    announcement: { text: "v2 is out — see what shipped", href: "#", dismissible: true },
    cta: { text: "Start free", href: "#" },
  },
};

export const WithLocaleSwitcher: Story = { args: { links, showLocaleSwitcher: true } };
