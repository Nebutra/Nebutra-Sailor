import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Compact label for status, category, or count. Pill shape, xs font, semibold weight. Includes semantic status variants and dot prop.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "success",
        "warning",
        "info",
        "error",
      ],
      description: "Visual style — maps to semantic color tokens",
    },
    dot: {
      control: "boolean",
      description: "Show a 6×6px status dot before the label",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Core Variants ────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { children: "Default", variant: "default" },
};

export const Secondary: Story = {
  args: { children: "Secondary", variant: "secondary" },
};

export const Destructive: Story = {
  args: { children: "Destructive", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

// ─── Semantic Status Variants ─────────────────────────────────────────────────

export const Success: Story = {
  args: { children: "Success", variant: "success" },
};

export const Warning: Story = {
  args: { children: "Warning", variant: "warning" },
};

export const Info: Story = {
  args: { children: "Info", variant: "info" },
};

export const Error: Story = {
  args: { children: "Error", variant: "error" },
};

// ─── Dot Variant ──────────────────────────────────────────────────────────────

export const WithDot: Story = {
  name: "Status Dot",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" dot>
        Live
      </Badge>
      <Badge variant="warning" dot>
        Pending
      </Badge>
      <Badge variant="error" dot>
        Failed
      </Badge>
      <Badge variant="outline" dot>
        Offline
      </Badge>
    </div>
  ),
};

// ─── All Variants ─────────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="error">Error</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success" dot>
          Live
        </Badge>
        <Badge variant="warning" dot>
          Pending
        </Badge>
        <Badge variant="info" dot>
          Syncing
        </Badge>
        <Badge variant="error" dot>
          Failed
        </Badge>
      </div>
    </div>
  ),
};
