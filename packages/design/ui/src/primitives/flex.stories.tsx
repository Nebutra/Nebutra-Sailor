import type { Meta, StoryObj } from "@storybook/react";
import { Flex } from "./flex";

const meta = {
  title: "Primitives/Flex",
  component: Flex,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Horizontal layout primitive. Arranges children in a row with configurable gap, alignment, justification, and wrap.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    gap: {
      control: { type: "select" },
      options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "baseline", "stretch"],
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between", "around", "evenly"],
    },
    direction: {
      control: "select",
      options: ["row", "row-reverse", "col", "col-reverse"],
    },
    wrap: { control: "boolean" },
  },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Flex gap={4} align="center" className="border rounded-lg p-4">
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">
        A
      </div>
      <div className="h-12 w-12 rounded-full bg-primary/40 flex items-center justify-center text-xs">
        B
      </div>
      <div className="h-6 w-6 rounded-full bg-primary/60 flex items-center justify-center text-xs">
        C
      </div>
    </Flex>
  ),
};

export const SpaceBetween: Story = {
  render: () => (
    <Flex justify="between" align="center" className="w-80 border rounded-lg p-4">
      <span className="font-semibold">Logo</span>
      <Flex gap={4}>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Home
        </a>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          About
        </a>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Contact
        </a>
      </Flex>
    </Flex>
  ),
};

export const Wrapping: Story = {
  render: () => (
    <Flex gap={3} wrap className="w-64 border rounded-lg p-4">
      {["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta"].map((label) => (
        <span key={label} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {label}
        </span>
      ))}
    </Flex>
  ),
};

export const Reversed: Story = {
  render: () => (
    <Flex direction="row-reverse" gap={2} align="center" className="border rounded-lg p-4">
      <span className="text-sm font-medium">Back</span>
      <span className="text-muted-foreground">←</span>
    </Flex>
  ),
};

export const ColumnDirection: Story = {
  render: () => (
    <Flex direction="col" gap={2} align="start" className="border rounded-lg p-4 w-64">
      <label className="text-sm font-medium">Username</label>
      <div className="border rounded px-3 py-1.5 w-full text-sm text-muted-foreground">
        john_doe
      </div>
    </Flex>
  ),
};

export const CenteredRow: Story = {
  render: () => (
    <Flex justify="center" align="center" gap={6} className="w-80 border rounded-lg py-6">
      {["🎉", "🚀", "✨"].map((emoji) => (
        <span key={emoji} className="text-2xl">
          {emoji}
        </span>
      ))}
    </Flex>
  ),
};
