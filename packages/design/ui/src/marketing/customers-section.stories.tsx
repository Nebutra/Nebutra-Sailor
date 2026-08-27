import type { Meta, StoryObj } from "@storybook/react";
import { CustomersSection } from "./customers-section";

const meta: Meta<typeof CustomersSection> = {
  title: "Marketing/CustomersSection",
  component: CustomersSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof CustomersSection>;

const swatch = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28"><rect width="120" height="28" rx="4" fill="%23888" opacity="0.25"/><text x="60" y="19" font-family="sans-serif" font-size="12" fill="%23666" text-anchor="middle">${label}</text></svg>`,
  )}`;

const customers = ["Acme", "Globex", "Initech", "Umbrella", "Soylent"].map((name) => ({
  src: swatch(name),
  alt: name,
  height: 28,
}));

export const Default: Story = { args: { customers } };

export const WithLink: Story = {
  args: { customers, linkText: "Read the case studies", linkHref: "#" },
};
