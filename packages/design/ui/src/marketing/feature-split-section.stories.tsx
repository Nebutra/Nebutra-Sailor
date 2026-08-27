import { ShieldCheck } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { FeatureSplitSection } from "./feature-split-section";

const meta: Meta<typeof FeatureSplitSection> = {
  title: "Marketing/FeatureSplitSection",
  component: FeatureSplitSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeatureSplitSection>;

const features = [
  { title: "Envelope encryption", description: "KMS-backed data keys, rotated per tenant." },
  { title: "Scoped audit trail", description: "Every privileged read and write is attributable." },
  { title: "Least privilege", description: "CASL in process, OpenFGA when relationships grow." },
];

const media = (
  <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-xl)] bg-neutral-3 text-neutral-10 text-sm">
    media slot
  </div>
);

export const Default: Story = {
  args: { title: "Security that survives an audit", features, media },
};

export const MediaLeft: Story = {
  args: { title: "Security that survives an audit", features, media, mediaPosition: "left" },
};

export const WithBadgeAndIcon: Story = {
  args: {
    badge: "Enterprise",
    title: "Security that survives an audit",
    description: "The controls a procurement review asks for, wired in from day one.",
    features,
    featureIcon: ShieldCheck,
    media,
  },
};
