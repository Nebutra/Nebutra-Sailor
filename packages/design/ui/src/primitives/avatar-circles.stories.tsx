import type { Meta, StoryObj } from "@storybook/react";
import { AvatarCircles } from "./avatar-circles";

const meta = {
  title: "Primitives/AvatarCircles",
  component: AvatarCircles,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Overlapping circular avatar stack with an optional overflow count indicator. Perfect for showing team members, contributors, or social proof.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    numPeople: { control: "number" },
    size: { control: { type: "range", min: 24, max: 80, step: 4 } },
  },
} satisfies Meta<typeof AvatarCircles>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleAvatars = [
  {
    imageUrl: "https://avatars.githubusercontent.com/u/20110627",
    profileUrl: "https://github.com/rdev",
    alt: "User 1",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/4211028",
    profileUrl: "https://github.com/user2",
    alt: "User 2",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/583231",
    profileUrl: "https://github.com/octocat",
    alt: "Octocat",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/9919",
    profileUrl: "https://github.com/user4",
    alt: "User 4",
  },
];

export const Default: Story = {
  render: () => <AvatarCircles avatarUrls={sampleAvatars} />,
};

export const WithOverflow: Story = {
  render: () => <AvatarCircles avatarUrls={sampleAvatars} numPeople={99} />,
};

export const LargeSize: Story = {
  render: () => <AvatarCircles avatarUrls={sampleAvatars} numPeople={50} size={56} />,
};

export const SocialProof: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AvatarCircles avatarUrls={sampleAvatars} numPeople={1200} />
      <div>
        <p className="text-sm font-semibold">Join 1,200+ developers</p>
        <p className="text-xs text-muted-foreground">Building with Nebutra today</p>
      </div>
    </div>
  ),
};

export const FewAvatars: Story = {
  render: () => <AvatarCircles avatarUrls={sampleAvatars.slice(0, 2)} numPeople={3} />,
};
