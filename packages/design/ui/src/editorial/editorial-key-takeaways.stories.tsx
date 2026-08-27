import type { Meta, StoryObj } from "@storybook/react";
import { EditorialKeyTakeaways } from "./editorial-key-takeaways";

const meta: Meta<typeof EditorialKeyTakeaways> = {
  title: "Editorial/KeyTakeaways",
  component: EditorialKeyTakeaways,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Summary panel that opens a long piece. A reader should be able to take the numbered lines and leave.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialKeyTakeaways>;

export const Default: Story = {
  args: {
    title: "What this piece argues",
    items: [
      { text: "Anyone can ship an AI SaaS in a weekend, so shipping is no longer the moat." },
      {
        text: "Differentiation and defensibility are different things, and conflating them loses.",
      },
      { text: "Taste and speed are the two constraints that did not get democratized." },
      { text: "Distribution comes before product for solo founders, every time." },
    ],
  },
};

export const Localized: Story = {
  args: {
    label: "核心结论",
    title: "这篇文章的论点",
    items: [
      { text: "人人都能在周末交付一个 AI SaaS，所以「能交付」不再是护城河。" },
      { text: "差异化和可防御性是两件事，混为一谈的团队会被更有策略的对手绕过。" },
      { text: "品味和速度，是唯二没有被民主化的约束。" },
    ],
  },
};
