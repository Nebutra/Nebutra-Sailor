import type { Meta, StoryObj } from "@storybook/react";
import { LogoCloudGrid } from "./logo-cloud-grid";

const meta: Meta<typeof LogoCloudGrid> = {
  title: "Marketing/LogoCloudGrid",
  component: LogoCloudGrid,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof LogoCloudGrid>;

const swatch = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32"><rect width="120" height="32" rx="4" fill="%23888" opacity="0.25"/><text x="60" y="21" font-family="sans-serif" font-size="13" fill="%23666" text-anchor="middle">${label}</text></svg>`,
  )}`;

const logos = ["Acme", "Globex", "Initech", "Umbrella", "Soylent", "Hooli"].map((name) => ({
  src: swatch(name),
  alt: name,
}));

/** No args — the component's own default logo set. */
export const Default: Story = { args: {} };
export const CustomLogos: Story = { args: { logos } };
export const WithoutDecorators: Story = { args: { logos, showDecorators: false } };
