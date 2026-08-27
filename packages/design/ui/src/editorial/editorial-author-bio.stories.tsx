import type { Meta, StoryObj } from "@storybook/react";
import { EditorialAuthorBio } from "./editorial-author-bio";

const meta: Meta<typeof EditorialAuthorBio> = {
  title: "Editorial/AuthorBio",
  component: EditorialAuthorBio,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Byline card closing an article. The avatar is a slot, so apps supply their own image component.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialAuthorBio>;

export const Default: Story = {
  args: {
    name: "Tseka Luk",
    role: "Founder, Nebutra",
    bio: "Writes about product engineering and AI SaaS delivery. Low-frequency, long-form.",
    avatar: (
      <span className="flex size-full items-center justify-center bg-muted font-mono text-sm font-semibold text-muted-foreground">
        TL
      </span>
    ),
    links: [
      { label: "Website", href: "https://nebutra.com" },
      { label: "GitHub", href: "https://github.com/Nebutra" },
    ],
  },
};

export const Localized: Story = {
  args: {
    label: "作者",
    name: "Tseka Luk",
    role: "Nebutra 创始人",
    bio: "写产品工程和 AI SaaS 交付。低频、长文。",
  },
};

export const NameOnly: Story = {
  name: "Name only",
  args: { name: "Tseka Luk" },
};
