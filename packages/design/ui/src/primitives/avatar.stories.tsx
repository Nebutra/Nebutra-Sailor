import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "./avatar";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "User identity display via image with initials fallback. Five size variants (xs/sm/md/lg/xl). AvatarGroup for stacked lists.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "Size preset — xs=20px sm=32px md=40px lg=56px xl=80px",
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Base ─────────────────────────────────────────────────────────────────────

export const WithImage: Story = {
  render: () => (
    <Avatar size="md">
      <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
      <AvatarFallback size="md">CN</AvatarFallback>
    </Avatar>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <Avatar size="md">
      <AvatarImage src="/broken-image.png" alt="broken" />
      <AvatarFallback size="md">NB</AvatarFallback>
    </Avatar>
  ),
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Avatar key={size} size={size}>
          <AvatarFallback size={size}>{size.toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};

// ─── Group — AvatarGroup component ────────────────────────────────────────────

const SAMPLE_USERS = [
  { src: "https://github.com/shadcn.png", alt: "shadcn", fallback: "SC" },
  { alt: "Alice B", fallback: "AB" },
  { alt: "Carol D", fallback: "CD" },
  { alt: "Evan F", fallback: "EF" },
  { alt: "Grace H", fallback: "GH" },
  { alt: "Ivan J", fallback: "IJ" },
];

export const Group: Story = {
  name: "AvatarGroup",
  render: () => (
    <div className="flex flex-col gap-4">
      <AvatarGroup items={SAMPLE_USERS} size="sm" max={4} />
      <AvatarGroup items={SAMPLE_USERS} size="md" max={3} />
    </div>
  ),
};
