import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { TextScramble } from "./text-scramble";

const meta = {
  title: "Primitives/TextScramble",
  component: TextScramble,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Text that resolves from random characters into its final value. The real text is always the end state; use it for short labels, not for content people must read mid-animation.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    duration: { control: { type: "range", min: 0.2, max: 3, step: 0.1 } },
    speed: { control: { type: "range", min: 0.01, max: 0.2, step: 0.01 } },
  },
  args: { children: "Ship AI products, not boilerplate." },
} satisfies Meta<typeof TextScramble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "text-lg font-medium text-foreground" },
};

export const Mono: Story = {
  args: {
    className: "font-mono text-sm uppercase tracking-wider text-muted-foreground",
    children: "deploying to production",
  },
};

export const DotsOnly: Story = {
  args: { characterSet: ". ", duration: 1.2, children: "Generating..." },
};

export const OnHover: Story = {
  render: (args) => {
    const Demo = () => {
      const [trigger, setTrigger] = useState(false);
      return (
        <TextScramble
          {...args}
          as="span"
          speed={0.02}
          trigger={trigger}
          onHoverStart={() => setTrigger(true)}
          onScrambleComplete={() => setTrigger(false)}
          className="cursor-default text-lg font-medium text-foreground"
        >
          Hover me
        </TextScramble>
      );
    };
    return <Demo />;
  },
};
