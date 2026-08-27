import { ArrowCircleDown, CheckCircleFill, ClockDashed } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "./avatar";
import { AvatarWithIcon, BitbucketAvatar, GitHubAvatar, GitLabAvatar } from "./avatar-extended";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "User, team, or organization identity display with image fallback, numeric sizing, stacked groups, and platform badge helpers.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", 32, 48, 90],
      description: "Preset size or pixel value.",
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const gh = (username: string) => `https://avatars.githubusercontent.com/${username}?s=96`;

export const Default: Story = {
  render: () => <Avatar size={32} src={gh("rauchg")} title="Guillermo Rauch" />,
};

export const Fallback: Story = {
  render: () => <Avatar letter="NB" size={32} title="Nebutra" />,
};

export const Placeholder: Story = {
  render: () => <Avatar placeholder size={90} />,
};

export const Composition: Story = {
  render: () => (
    <Avatar size="md">
      <AvatarImage src={gh("leerob")} alt="Avatar for Lee Robinson" />
      <AvatarFallback>LR</AvatarFallback>
    </Avatar>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <AvatarGroup
        members={[{ username: "leerob" }, { username: "rauchg" }, { username: "shuding" }]}
        size={32}
      />
      <AvatarGroup
        limit={4}
        members={[
          { username: "sambecker" },
          { username: "rauno" },
          { username: "skllcrn" },
          { username: "almonk" },
          { username: "rauchg" },
        ]}
        size={32}
      />
    </div>
  ),
};

export const Git: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <GitHubAvatar size={32} username="rauchg" />
      <GitLabAvatar size={32} username="leerob" />
      <BitbucketAvatar size={32} username="atlassian" />
    </div>
  ),
};

export const WithCustomIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-3.5">
      <AvatarWithIcon
        alt="Download queued"
        icon={<ArrowCircleDown className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("rauchg")}
      />
      <AvatarWithIcon
        alt="Verified member"
        icon={<CheckCircleFill className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("shuding")}
      />
      <AvatarWithIcon
        alt="Pending member"
        icon={<ClockDashed className="text-muted-foreground" size={14} />}
        iconBackground
        size={32}
        src={gh("leerob")}
      />
    </div>
  ),
};
