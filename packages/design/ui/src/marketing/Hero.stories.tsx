import type { Meta, StoryObj } from "@storybook/react";
import { Hero } from "./Hero";

const meta: Meta<typeof Hero> = {
  title: "Marketing/Hero",
  component: Hero,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Top-of-page hero. Every prop is optional — rendering with no args gives the shipped defaults, which is what a landing page gets before it customises anything. The section container width is the value under review in the container-contract cleanup, so keep these stories as the visual baseline.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Hero>;

export const Default: Story = { args: {} };

export const Centered: Story = {
  args: {
    variant: "centered",
    headline: "Ship AI products, not boilerplate",
    subheadline:
      "Auth, billing, multi-tenancy, and a design system — wired together and ready to deploy.",
    primaryCTA: { text: "Start building", href: "#" },
    secondaryCTA: { text: "Read the docs", href: "#" },
  },
};

export const Split: Story = {
  args: {
    variant: "split",
    headline: "One platform, every surface",
    subheadline: "The same primitives power the dashboard, the docs, and the marketing site.",
    primaryCTA: { text: "Get started", href: "#" },
  },
};

export const MeshBackground: Story = {
  args: { backgroundType: "mesh", headline: "Mesh gradient backdrop" },
};

/** No trust badges — the minimal configuration a bare landing page starts from. */
export const WithoutTrustBadges: Story = {
  args: { showTrustBadges: false, headline: "Minimal hero" },
};
