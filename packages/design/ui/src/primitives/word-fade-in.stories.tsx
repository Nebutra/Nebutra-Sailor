import type { Meta, StoryObj } from "@storybook/react";
import { WordFadeIn } from "./word-fade-in";

const meta = {
  title: "Primitives/WordFadeIn",
  component: WordFadeIn,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Staggered word-by-word fade-in animation powered by Framer Motion. Elegant reveal for headlines, quotes, and welcome messages.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div"],
      description: "HTML element to render",
    },
    delay: {
      control: { type: "range", min: 0.05, max: 0.5, step: 0.05 },
      description: "Stagger delay between words in seconds",
    },
    trigger: {
      control: "select",
      options: ["mount", "inView"],
      description: "When to start the animation",
    },
    animate: {
      control: "boolean",
      description: "Toggle animation on/off",
    },
  },
} satisfies Meta<typeof WordFadeIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    words: "Welcome to our platform",
    className: "text-4xl font-bold",
  },
};

export const AsParagraph: Story = {
  args: {
    words: "Each word fades in one by one",
    as: "p",
    className: "text-lg text-muted-foreground",
  },
};

export const SlowerStagger: Story = {
  args: {
    words: "Take your time with this",
    delay: 0.3,
    className: "text-4xl font-bold",
  },
};

export const InViewTrigger: Story = {
  name: "Scroll Triggered",
  args: {
    words: "This appears when scrolled into view",
    trigger: "inView",
    className: "text-3xl font-bold",
  },
};
