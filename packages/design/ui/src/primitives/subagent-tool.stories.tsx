import type { Meta, StoryObj } from "@storybook/react";
import { SubagentTool } from "./subagent-tool";

const meta: Meta<typeof SubagentTool> = {
  title: "Primitives/SubagentTool",
  component: SubagentTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline status pill for delegated subagent invocations. " +
          "Lightest member of the chat tool-family. Sibling of EditTool / " +
          "QuestionTool / McpTool / TodoTool / SearchTool.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SubagentTool>;

export const Completed: Story = {
  name: "Completed (with description + elapsed)",
  render: () => (
    <div className="w-[420px]">
      <SubagentTool state="completed" description="Collect previews" elapsedTime="6s" />
    </div>
  ),
};

export const Pending: Story = {
  name: "Pending — shimmer label",
  render: () => (
    <div className="w-[420px]">
      <SubagentTool state="pending" description="ListFiles" elapsedTime="2s" />
    </div>
  ),
};

export const Interrupted: Story = {
  name: "Interrupted (details suppressed)",
  parameters: {
    docs: {
      description: {
        story:
          "Description and elapsed time are suppressed — interrupted is a terminal state and the partial values are ambiguous.",
      },
    },
  },
  render: () => (
    <div className="w-[420px]">
      <SubagentTool
        state="interrupted"
        description="this should NOT render"
        elapsedTime="this should NOT render"
      />
    </div>
  ),
};

export const Minimal: Story = {
  name: "Completed — no description or elapsed",
  render: () => (
    <div className="w-[420px]">
      <SubagentTool state="completed" />
    </div>
  ),
};

export const LongDescription: Story = {
  name: "Long description (truncates)",
  render: () => (
    <div className="w-[420px]">
      <SubagentTool
        state="pending"
        description="Searching across 14 markdown files in apps/design-docs/content for usages of the deprecated TextShimmer.legacy API"
        elapsedTime="1m 24s"
      />
    </div>
  ),
};

export const StateLadder: Story = {
  name: "State ladder",
  parameters: {
    docs: {
      description: {
        story: "Visual reference for the three terminal/transient states stacked together.",
      },
    },
  },
  render: () => (
    <div className="flex w-[420px] flex-col gap-3">
      <SubagentTool state="pending" description="Reading" elapsedTime="2s" />
      <SubagentTool state="completed" description="Audit complete" elapsedTime="14s" />
      <SubagentTool state="interrupted" />
    </div>
  ),
};
