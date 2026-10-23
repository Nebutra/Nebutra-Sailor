import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta = {
  title: "Primitives/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "One-pixel divider between groups of content, horizontal or vertical.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: { orientation: { control: "inline-radio", options: ["horizontal", "vertical"] } },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-72 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Nebutra Design</p>
        <p className="text-sm text-muted-foreground">Tokens, primitives and patterns.</p>
      </div>
      <Separator {...args} orientation="horizontal" />
      <p className="text-sm text-muted-foreground">Open source under Apache-2.0.</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <div className="flex h-5 items-center gap-4 text-sm text-foreground">
      <span>Docs</span>
      <Separator {...args} orientation="vertical" />
      <span>Showcase</span>
      <Separator {...args} orientation="vertical" />
      <span>Changelog</span>
    </div>
  ),
};
