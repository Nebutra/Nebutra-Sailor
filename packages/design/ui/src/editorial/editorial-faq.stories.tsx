import type { Meta, StoryObj } from "@storybook/react";
import { EditorialFaq } from "./editorial-faq";

const meta: Meta<typeof EditorialFaq> = {
  title: "Editorial/Faq",
  component: EditorialFaq,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Collapsible question list built on native `<details>`. No client bundle, works before hydration, and in-page find can surface answers inside collapsed entries.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialFaq>;

export const Default: Story = {
  args: {
    label: "Frequently asked",
    items: [
      {
        question: "Do I have to publish both languages?",
        answer:
          "Yes, unless you explicitly ask for single-language publication. Siblings share one translation key and differ only by slug.",
      },
      {
        question: "Can I skip the cover image?",
        answer:
          "Only with a recorded exception. A missing source image is not itself a reason to skip generating editorial cover art.",
      },
      {
        question: "When do I use PortableText JSON instead of Markdown?",
        answer:
          "When the piece contains callouts, stat grids, charts, source cards or component layouts — anything Markdown would flatten into prose.",
      },
    ],
  },
};

export const FirstOpen: Story = {
  name: "First entry open",
  args: {
    defaultOpenFirst: true,
    title: "Publishing questions",
    items: [
      { question: "Where do drafts live?", answer: "In apps/studio/content/blog/." },
      {
        question: "What triggers a rebuild?",
        answer: "Nothing — content publishing revalidates in place.",
      },
    ],
  },
};
