import type { Meta, StoryObj } from "@storybook/react";
import {
  CodeDiff,
  DEFAULT_TERMINAL_ITEMS,
  TerminalControlSectionAnimated,
} from "./terminal-control-section-animated";

const meta: Meta<typeof TerminalControlSectionAnimated> = {
  title: "Marketing/TerminalControlSectionAnimated",
  component: TerminalControlSectionAnimated,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof TerminalControlSectionAnimated>;

/** Ships with a real diff reel — this is the intended presentation. */
export const Default: Story = { args: {} };

export const CustomTitle: Story = {
  args: { title: "Watch the agent work, line by line" },
};

/** A single step, for when the section sits next to other content. */
export const SingleItem: Story = {
  args: { items: DEFAULT_TERMINAL_ITEMS.slice(0, 1) },
};

/** The diff block on its own, at the size it renders inside the section. */
export const DiffOnly: StoryObj<typeof CodeDiff> = {
  render: () => (
    <div className="mx-auto max-w-3xl p-10">
      {DEFAULT_TERMINAL_ITEMS[0] ? <CodeDiff diff={DEFAULT_TERMINAL_ITEMS[0].diff} /> : null}
    </div>
  ),
};
