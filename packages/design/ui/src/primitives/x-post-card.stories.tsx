import type { Meta, StoryObj } from "@storybook/react";
import { XPostCard, XPostSkeleton } from "./x-post-card";

const meta = {
  title: "Primitives/XPostCard",
  component: XPostCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Embed X (formerly Twitter) posts using react-tweet. XPostCard wraps ClientXPostCard in a Suspense boundary. Includes a loading skeleton and error states.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof XPostCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "1441032681968212480",
  },
};

export const WithCustomFallback: Story = {
  args: {
    id: "1441032681968212480",
    fallback: (
      <div className="flex h-48 max-w-lg items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">Loading post...</p>
      </div>
    ),
  },
};

export const Skeleton: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Loading skeleton:</p>
      <XPostSkeleton />
    </div>
  ),
};

export const SkeletonCustomSize: Story = {
  render: () => <XPostSkeleton className="max-w-sm" />,
};

export const MultiplePosts: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <XPostCard id="1441032681968212480" />
      <XPostCard id="1441032681968212480" fallback={<XPostSkeleton />} />
    </div>
  ),
};
