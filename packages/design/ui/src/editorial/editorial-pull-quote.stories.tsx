import type { Meta, StoryObj } from "@storybook/react";
import { EditorialPullQuote } from "./editorial-pull-quote";

const meta: Meta<typeof EditorialPullQuote> = {
  title: "Editorial/PullQuote",
  component: EditorialPullQuote,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Display quote lifted out of the reading column. No oversized quotation glyph — at this size the type already reads as a quote.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialPullQuote>;

export const Default: Story = {
  args: {
    quote:
      "The two things that are most important when intelligence on tap is available are actually agency and taste.",
    attribution: "Garry Tan",
    role: "CEO, Y Combinator",
  },
};

export const WithSourceLink: Story = {
  name: "With source link",
  args: {
    quote:
      "All AI applications are wrapper applications. Saying they have barriers is fooling people.",
    attribution: "Zhu Xiaohu",
    role: "GSR Ventures",
    sourceHref: "https://example.com/zhongguancun-forum",
  },
};

export const WithPortrait: Story = {
  name: "With portrait",
  args: {
    quote: "In consumer AI, momentum is the moat.",
    attribution: "Bryan Kim",
    role: "Partner, a16z",
    portrait: (
      <span className="flex size-full items-center justify-center bg-muted font-mono text-xs font-semibold text-muted-foreground">
        BK
      </span>
    ),
  },
};

export const QuoteOnly: Story = {
  name: "Quote only",
  args: {
    quote: "Trade margin for moat.",
  },
};
