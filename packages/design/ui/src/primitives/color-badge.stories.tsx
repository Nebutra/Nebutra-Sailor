import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, Shield, Star, Zap } from "lucide-react";
import { ColorBadge } from "./color-badge";

const meta = {
  title: "Primitives/ColorBadge",
  component: ColorBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Vercel-style multi-color badge with 20 variants, 3 sizes, icon support, and optional link rendering.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "gray",
        "gray-subtle",
        "blue",
        "blue-subtle",
        "purple",
        "purple-subtle",
        "amber",
        "amber-subtle",
        "red",
        "red-subtle",
        "pink",
        "pink-subtle",
        "green",
        "green-subtle",
        "teal",
        "teal-subtle",
        "inverted",
        "trial",
        "turbo",
        "pill",
      ],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    capitalize: { control: "boolean" },
  },
} satisfies Meta<typeof ColorBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "blue",
    children: "New",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(
        [
          "gray",
          "gray-subtle",
          "blue",
          "blue-subtle",
          "purple",
          "purple-subtle",
          "amber",
          "amber-subtle",
          "red",
          "red-subtle",
          "pink",
          "pink-subtle",
          "green",
          "green-subtle",
          "teal",
          "teal-subtle",
          "inverted",
          "trial",
          "turbo",
          "pill",
        ] as const
      ).map((variant) => (
        <ColorBadge key={variant} variant={variant}>
          {variant}
        </ColorBadge>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ColorBadge variant="blue" size="sm">
        Small
      </ColorBadge>
      <ColorBadge variant="blue" size="md">
        Medium
      </ColorBadge>
      <ColorBadge variant="blue" size="lg">
        Large
      </ColorBadge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <ColorBadge variant="purple" icon={<Shield />}>
        Protected
      </ColorBadge>
      <ColorBadge variant="amber" icon={<AlertTriangle />}>
        Warning
      </ColorBadge>
      <ColorBadge variant="green" icon={<Zap />}>
        Active
      </ColorBadge>
      <ColorBadge variant="blue" icon={<Star />}>
        Featured
      </ColorBadge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex gap-2">
      <ColorBadge variant="green">Active</ColorBadge>
      <ColorBadge variant="amber">Pending</ColorBadge>
      <ColorBadge variant="red">Error</ColorBadge>
      <ColorBadge variant="gray-subtle">Archived</ColorBadge>
    </div>
  ),
};

export const GradientBadges: Story = {
  render: () => (
    <div className="flex gap-2">
      <ColorBadge variant="trial">Trial</ColorBadge>
      <ColorBadge variant="turbo">Turbo</ColorBadge>
    </div>
  ),
};

export const SubtleVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(
        ["blue-subtle", "purple-subtle", "green-subtle", "amber-subtle", "red-subtle"] as const
      ).map((v) => (
        <ColorBadge key={v} variant={v}>
          {v}
        </ColorBadge>
      ))}
    </div>
  ),
};
