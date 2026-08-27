import type { Meta, StoryObj } from "@storybook/react";
import { SocialProof } from "./SocialProof";

const meta: Meta<typeof SocialProof> = {
  title: "Marketing/SocialProof",
  component: SocialProof,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

const swatch = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28"><rect width="120" height="28" rx="4" fill="%23888" opacity="0.25"/><text x="60" y="19" font-family="sans-serif" font-size="12" fill="%23666" text-anchor="middle">${label}</text></svg>`,
  )}`;

const logos = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli"].map((name) => ({
  name,
  src: swatch(name),
}));

const stats = [
  { value: "99.99", suffix: "%", label: "Origin availability" },
  { value: "1.2", suffix: "M", label: "Events per day" },
  { value: "40", suffix: "+", label: "Provider integrations" },
  { value: "12", label: "Minutes to first deploy" },
];

type Story = StoryObj<typeof SocialProof>;

export const Combined: Story = { args: { variant: "combined", logos, stats } };
export const LogosOnly: Story = { args: { variant: "logos-only", logos } };
export const StatsOnly: Story = { args: { variant: "stats-only", stats } };
