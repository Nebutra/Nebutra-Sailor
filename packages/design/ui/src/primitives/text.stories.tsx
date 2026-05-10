import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "./text";

const meta = {
  title: "Primitives/Text",
  component: Text,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Typography primitive for body text, captions, labels, and inline content. Supports variant, color, truncation, and line clamping from the token system.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["body", "body-sm", "label", "label-sm", "code"],
    },
    color: {
      control: "select",
      options: ["default", "muted", "accent", "inherit"],
    },
    truncate: { control: "boolean" },
    lineClamp: {
      control: { type: "select" },
      options: [undefined, 1, 2, 3, 4, 5, 6],
    },
    align: { control: "select", options: ["left", "center", "right"] },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-3 w-80">
      <Text variant="body">Body — Default paragraph text style</Text>
      <Text variant="body-sm">Body SM — Smaller body for secondary content</Text>
      <Text variant="label">Label — Form labels and metadata</Text>
      <Text variant="label-sm">Label SM — Micro labels and tags</Text>
      <Text variant="code">code — Monospace for inline code</Text>
    </div>
  ),
};

export const ColorTokens: Story = {
  render: () => (
    <div className="space-y-2 w-64">
      <Text color="default">Default foreground color</Text>
      <Text color="muted">Muted — secondary text</Text>
    </div>
  ),
};

export const TruncatedText: Story = {
  render: () => (
    <div className="w-56 space-y-3">
      <Text truncate className="block">
        This is a very long text that will be truncated with an ellipsis because the container is
        too narrow
      </Text>
    </div>
  ),
};

export const LineClamp: Story = {
  render: () => (
    <div className="w-64 space-y-4">
      <div>
        <Text variant="label-sm" color="muted" className="mb-1 block">
          lineClamp=2
        </Text>
        <Text lineClamp={2}>
          This paragraph will be clamped to exactly two lines. Any content beyond the second line
          will be hidden and replaced with an ellipsis. Here is more text to demonstrate the effect
          clearly.
        </Text>
      </div>
      <div>
        <Text variant="label-sm" color="muted" className="mb-1 block">
          lineClamp=3
        </Text>
        <Text lineClamp={3}>
          This paragraph will be clamped to exactly three lines. Any content beyond the third line
          will be hidden and replaced with an ellipsis. Here is more text to demonstrate the effect
          clearly across multiple lines.
        </Text>
      </div>
    </div>
  ),
};

export const PolymorphicElement: Story = {
  render: () => (
    <div className="space-y-3 w-72">
      <Text as="span" variant="label" color="muted">
        Published Jan 15, 2025 (rendered as &lt;span&gt;)
      </Text>
      <Text as="blockquote" variant="body" className="border-l-4 pl-4 italic">
        "Design is not just what it looks like. Design is how it works."
      </Text>
    </div>
  ),
};

export const Centered: Story = {
  render: () => (
    <Text align="center" color="muted" variant="body-sm" className="w-64 block">
      Centered supporting text for hero sections and empty states
    </Text>
  ),
};
