import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback } from "./avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta = {
  title: "Primitives/HoverCard",
  component: HoverCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Preview card that opens on pointer hover after a short delay. It is not reachable by keyboard or touch, so never put essential information only inside it.",
      },
    },
  },
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger className="text-sm font-medium text-foreground underline underline-offset-4">
        @nebutra
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>N</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Nebutra</p>
            <p className="text-sm text-muted-foreground">
              The open-source production layer for agent-built software.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const Placement: Story = {
  render: () => (
    <div className="flex gap-12">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <HoverCard key={side}>
          <HoverCardTrigger className="text-sm text-foreground underline underline-offset-4">
            {side}
          </HoverCardTrigger>
          <HoverCardContent side={side}>
            <p className="text-sm text-muted-foreground">Opens on the {side} side.</p>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
};

export const SlowOpen: Story = {
  name: "Custom delay",
  render: () => (
    <HoverCard openDelay={600} closeDelay={200}>
      <HoverCardTrigger className="text-sm text-foreground underline underline-offset-4">
        Hover and wait
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm text-muted-foreground">Opens after 600 ms, closes after 200 ms.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
