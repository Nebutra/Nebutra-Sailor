import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonText } from "./skeleton";

const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Loading placeholders for text, cards, and avatar-led layouts.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-72" />,
};

export const TextBlock: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonText lines={4} />
    </div>
  ),
};

export const AvatarAndCard: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="lg" />
        <div className="w-52">
          <SkeletonText lines={2} />
        </div>
      </div>
      <div className="w-80 rounded-lg border border-border">
        <SkeletonCard />
      </div>
    </div>
  ),
};
