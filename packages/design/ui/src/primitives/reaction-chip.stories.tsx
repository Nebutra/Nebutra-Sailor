import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MessageWithReactions, ReactionBadge, ReactionChip } from "./reaction-chip";

const meta = {
  title: "Primitives/ReactionChip",
  component: MessageWithReactions,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Emoji reaction system with three composable parts: ReactionChip (picker), ReactionBadge (count display), and MessageWithReactions (pre-composed message). Hover a message to reveal the reaction picker.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MessageWithReactions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Great work on this feature! The implementation looks clean.",
  },
};

export const WithCustomEmojis: Story = {
  args: {
    text: "Check out this new design system component.",
    reactionOptions: ["🔥", "💯", "🙌", "✨"],
  },
};

export const MultipleMesages: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <MessageWithReactions text="Shipped the new auth flow today. Ready for review!" />
      <div className="self-end">
        <MessageWithReactions
          text="Looks great! Left some comments in the PR."
          reactionOptions={["👍", "🎉", "❤️", "👀"]}
        />
      </div>
      <MessageWithReactions text="Will address the feedback first thing tomorrow." />
    </div>
  ),
};

export const ChipOnly: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | undefined>(undefined);
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">Selected: {selected ?? "none"}</p>
        <ReactionChip
          onSelect={(emoji) => setSelected((prev) => (prev === emoji ? undefined : emoji))}
          selected={selected}
        />
      </div>
    );
  },
};

export const BadgeOnly: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ReactionBadge emoji="👍" count={12} />
      <ReactionBadge emoji="❤️" count={5} />
      <ReactionBadge emoji="😂" count={3} />
      <ReactionBadge emoji="🎉" count={27} bump />
    </div>
  ),
};

export const WithChildren: Story = {
  render: () => (
    <MessageWithReactions>
      <div className="space-y-1">
        <p className="font-medium">PR #42: Add dark mode support</p>
        <p className="text-xs text-muted-foreground">3 files changed · +127 −43</p>
      </div>
    </MessageWithReactions>
  ),
};
