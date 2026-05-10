import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles, Star, TrendingUp, Zap } from "lucide-react";
import { DisplayCards } from "./display-cards";

const meta = {
  title: "Primitives/DisplayCards",
  component: DisplayCards,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Stacked card display with a skew effect and hover animations. Cards reveal on hover by lifting up and de-saturating. Perfect for decorative hero sections and feature showcases.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DisplayCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomCards: Story = {
  args: {
    cards: [
      {
        icon: <Star className="size-4 text-yellow-300" />,
        title: "Top Rated",
        description: "Loved by 10,000+ developers",
        date: "Updated daily",
        iconClassName: "bg-yellow-800",
        titleClassName: "text-yellow-400",
        className:
          "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      },
      {
        icon: <TrendingUp className="size-4 text-green-300" />,
        title: "Growing Fast",
        description: "100% week-over-week growth",
        date: "This week",
        iconClassName: "bg-green-800",
        titleClassName: "text-green-400",
        className:
          "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      },
      {
        icon: <Zap className="size-4 text-purple-300" />,
        title: "Lightning Fast",
        description: "Sub-50ms p99 latency globally",
        date: "Live",
        iconClassName: "bg-purple-800",
        titleClassName: "text-purple-400",
        className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
      },
    ],
  },
};

export const SingleCard: Story = {
  args: {
    cards: [
      {
        icon: <Sparkles className="size-4 text-blue-300" />,
        title: "Featured",
        description: "Discover amazing content here",
        date: "Just now",
      },
    ],
  },
};

export const InHeroSection: Story = {
  render: () => (
    <div className="relative flex h-80 w-[500px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted p-8">
      <div className="absolute left-8 top-8">
        <h2 className="text-2xl font-bold text-white">Latest Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Hover to explore</p>
      </div>
      <DisplayCards />
    </div>
  ),
};
