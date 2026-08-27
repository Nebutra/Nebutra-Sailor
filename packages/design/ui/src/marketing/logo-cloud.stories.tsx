import type { Meta, StoryObj } from "@storybook/react";
import { LogoCloudSlider } from "./logo-cloud";

const meta: Meta<typeof LogoCloudSlider> = {
  title: "Marketing/LogoCloudSlider",
  component: LogoCloudSlider,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof LogoCloudSlider>;

// Inline SVG data URIs keep the story self-contained — no network, no fixtures.
const swatch = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32"><rect width="120" height="32" rx="4" fill="%23888" opacity="0.25"/><text x="60" y="21" font-family="sans-serif" font-size="13" fill="%23666" text-anchor="middle">${label}</text></svg>`,
  )}`;

// This component declares its own local `Logo` type (src + alt), distinct from
// the `Logo` in marketing/types.ts (src + name) — see the duplicate-type note
// in the audit.
const logos = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli"].map((name) => ({
  src: swatch(name),
  alt: name,
}));

export const Default: Story = { args: { logos } };
export const Reverse: Story = { args: { logos, reverse: true } };
export const SlowOnHover: Story = { args: { logos, speed: 40, speedOnHover: 8 } };
