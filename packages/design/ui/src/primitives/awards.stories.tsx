import type { Meta, StoryObj } from "@storybook/react";
import { Awards } from "./awards";

const meta = {
  title: "Primitives/Awards",
  component: Awards,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative award, badge, certificate, and achievement components with 6 visual variants: badge, award, certificate, stamp, sticker, and id-card.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["badge", "award", "certificate", "stamp", "sticker", "id-card"],
    },
    level: {
      control: "select",
      options: ["bronze", "silver", "gold", "platinum"],
    },
  },
} satisfies Meta<typeof Awards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Badge: Story = {
  args: {
    variant: "badge",
    title: "Top Contributor",
    subtitle: "Open Source Award",
    recipient: "Jane Smith",
    date: "March 2026",
  },
};

export const AwardVariant: Story = {
  args: {
    variant: "award",
    title: "Excellence Award",
    subtitle: "For outstanding performance",
    recipient: "Jane Smith",
    date: "March 2026",
    level: "gold",
  },
};

export const Certificate: Story = {
  args: {
    variant: "certificate",
    title: "Achievement",
    subtitle: "Successfully completed the advanced program",
    recipient: "Jane Smith",
    date: "March 15, 2026",
  },
};

export const Stamp: Story = {
  args: {
    variant: "stamp",
    title: "CERTIFIED",
    subtitle: "PROFESSIONAL",
    recipient: "Jane Smith",
    date: "2026",
  },
};

export const Sticker: Story = {
  args: {
    variant: "sticker",
    title: "PRO",
  },
};

export const IdCard: Story = {
  args: {
    variant: "id-card",
    title: "Jane Smith",
    subtitle: "Senior Engineer",
    description: "Engineering",
    date: "ENG-2026",
  },
};

export const LevelComparison: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 justify-center">
      {(["bronze", "silver", "gold", "platinum"] as const).map((level) => (
        <Awards
          key={level}
          variant="award"
          title="Excellence"
          subtitle="Top Performer"
          recipient="Jane Smith"
          date="2026"
          level={level}
        />
      ))}
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 items-start justify-center">
      <Awards
        variant="badge"
        title="Top Contributor"
        subtitle="Award 2026"
        recipient="Jane Smith"
        date="March 2026"
      />
      <Awards
        variant="certificate"
        title="Achievement"
        subtitle="Completed the program"
        recipient="Jane Smith"
        date="March 2026"
      />
      <Awards variant="stamp" title="CERTIFIED" subtitle="PROFESSIONAL" date="2026" />
    </div>
  ),
};
