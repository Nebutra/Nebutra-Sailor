import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedHeadline } from "./animated-headline";

const meta: Meta<typeof AnimatedHeadline> = {
  title: "Marketing/AnimatedHeadline",
  component: AnimatedHeadline,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AnimatedHeadline>;

export const Default: Story = { args: { words: ["Ship.", "Scale.", "Sleep."] } };

export const AiTheme: Story = {
  args: { words: ["Build", "with", "agents"], theme: "ai" },
};

/** Per-word gradients override the theme. */
export const CustomGradients: Story = {
  args: {
    words: [
      { text: "Design." },
      { text: "Build.", gradientFrom: "var(--brand-primary)", gradientTo: "var(--brand-accent)" },
      { text: "Ship." },
    ],
    theme: "custom",
  },
};

export const Column: Story = {
  args: { words: ["One", "word", "per", "line"], direction: "column" },
};
