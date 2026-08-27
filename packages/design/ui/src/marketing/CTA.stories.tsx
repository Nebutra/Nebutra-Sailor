import type { Meta, StoryObj } from "@storybook/react";
import { CTA } from "./CTA";

const meta: Meta<typeof CTA> = {
  title: "Marketing/CTA",
  component: CTA,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Closing call-to-action band. `backgroundType` decides whether the copy renders on a dark canvas (gradient / image) or an inverted one (solid), so check contrast in both.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CTA>;

export const Default: Story = { args: {} };

export const Simple: Story = {
  args: {
    variant: "simple",
    headline: "Ready when you are",
    primaryCTA: { text: "Start free", href: "#" },
  },
};

export const Split: Story = {
  args: {
    variant: "split",
    headline: "Bring your own stack",
    subheadline: "Swap the auth, billing, or queue provider without touching product code.",
    primaryCTA: { text: "Read the ADR", href: "#" },
    secondaryCTA: { text: "Talk to us", href: "#" },
  },
};

/** Solid background inverts the text treatment — the contrast edge case. */
export const SolidBackground: Story = {
  args: { backgroundType: "solid", headline: "On a solid surface" },
};

export const Compact: Story = { args: { density: "compact", headline: "Compact density" } };
