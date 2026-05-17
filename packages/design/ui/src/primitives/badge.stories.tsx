import { Shield } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const GEIST_VARIANTS = [
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
] as const;

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Short, static metadata label for status, plan tier, environment, or role. Use the pill variant for links and keep badge copy to one or two words.",
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
        ...GEIST_VARIANTS,
      ],
      description:
        "Visual style. Geist variants map meaning to color; pill is for link-like chips.",
    },
    dot: {
      control: "boolean",
      description: "Legacy text-plus-dot affordance. Prefer Status Dot for dot-only indicators.",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Core Variants ────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { children: "Active", variant: "gray" },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

// ─── All Variants ─────────────────────────────────────────────────────────────

export const Variants: Story = {
  name: "Variants",
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      {GEIST_VARIANTS.filter((variant) => variant !== "pill").map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant === "trial" ? "Trial" : variant === "turbo" ? "Turborepo" : variant}
        </Badge>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {["gray", "blue", "purple", "amber", "red", "pink", "green", "teal"].map((variant) => (
        <div key={variant} className="flex items-center gap-1">
          <Badge icon={<Shield />} size="lg" variant={variant as (typeof GEIST_VARIANTS)[number]}>
            {variant}
          </Badge>
          <Badge icon={<Shield />} size="md" variant={variant as (typeof GEIST_VARIANTS)[number]}>
            {variant}
          </Badge>
          <Badge icon={<Shield />} size="sm" variant={variant as (typeof GEIST_VARIANTS)[number]}>
            {variant}
          </Badge>
          <Badge
            icon={<Shield />}
            size="sm"
            variant={`${variant}-subtle` as (typeof GEIST_VARIANTS)[number]}
          >
            {variant}
          </Badge>
          <Badge
            icon={<Shield />}
            size="md"
            variant={`${variant}-subtle` as (typeof GEIST_VARIANTS)[number]}
          >
            {variant}
          </Badge>
          <Badge
            icon={<Shield />}
            size="lg"
            variant={`${variant}-subtle` as (typeof GEIST_VARIANTS)[number]}
          >
            {variant}
          </Badge>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <Badge icon={<Shield />} size="lg" variant="inverted">
          inverted
        </Badge>
        <Badge icon={<Shield />} size="md" variant="inverted">
          inverted
        </Badge>
        <Badge icon={<Shield />} size="sm" variant="inverted">
          inverted
        </Badge>
      </div>
    </div>
  ),
};

export const PillLinks: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge asChild size="sm" variant="pill">
        <a href="#badge-pill">Label</a>
      </Badge>
      <Badge asChild size="md" variant="pill">
        <a href="#badge-pill">Label</a>
      </Badge>
      <Badge asChild icon={<Shield />} size="lg" variant="pill">
        <a href="#badge-pill">Label</a>
      </Badge>
    </div>
  ),
};
