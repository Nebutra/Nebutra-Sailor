import type { Meta, StoryObj } from "@storybook/react";
import { ContextCard } from "./context-card";

const meta = {
  title: "Primitives/ContextCard",
  component: ContextCard.Trigger,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hover card that shows rich content on hover or focus. " +
          "Built on Radix Tooltip. Supports top, bottom, left, and right placements.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextCard.Trigger>;

export default meta;
type Story = StoryObj<typeof meta>;

const CONTENT = "The Evil Rabbit Jumped over the Fence";

export const Default: Story = {
  args: {
    content: CONTENT,
    side: "top",
    children: <span className="cursor-default underline decoration-dotted">Top</span>,
  },
};

export const AllSides: Story = {
  render: () => (
    <div className="flex flex-row items-stretch justify-around gap-16">
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={CONTENT} side="top">
          <span className="cursor-default underline decoration-dotted">Top</span>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={CONTENT} side="bottom">
          <span className="cursor-default underline decoration-dotted">Bottom</span>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={CONTENT} side="left">
          <span className="cursor-default underline decoration-dotted">Left</span>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={CONTENT} side="right">
          <span className="cursor-default underline decoration-dotted">Right</span>
        </ContextCard.Trigger>
      </div>
    </div>
  ),
};

export const RichContent: Story = {
  render: () => (
    <ContextCard.Trigger
      side="top"
      content={
        <div className="flex flex-col gap-1">
          <p className="font-medium">Evil Rabbit</p>
          <p className="text-muted-foreground text-xs">Jumped over the Fence</p>
        </div>
      }
    >
      <span className="cursor-default underline decoration-dotted">Hover for details</span>
    </ContextCard.Trigger>
  ),
};

export const OnButton: Story = {
  render: () => (
    <ContextCard.Trigger content="Click to submit your form" side="bottom">
      <button
        type="button"
        className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
      >
        Submit
      </button>
    </ContextCard.Trigger>
  ),
};
