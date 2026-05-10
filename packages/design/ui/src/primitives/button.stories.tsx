import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, Command, ExternalLink, Mail, Plus, Search, Settings } from "lucide-react";
import { Button, ButtonLink } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Interactive element for triggering actions. Follows VI brand standards with brand-blue primary and Geist-quality sizing.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
        "tertiary",
        "warning",
      ],
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["tiny", "sm", "default", "lg", "icon"],
      description: "Size preset — maps to 24/32/40/48px heights",
    },
    shape: {
      control: "select",
      options: ["default", "square", "circle"],
      description: "Button shape",
    },
    shadow: {
      control: "select",
      options: [false, true, "sm", "md", "lg"],
      description: "Elevation shadow level",
    },
    disabled: { control: "boolean" },
    loading: {
      control: "boolean",
      description: "Show loading spinner + disable",
    },
    asChild: { table: { disable: true } },
    prefix: { table: { disable: true } },
    suffix: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Variants ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { children: "Button", variant: "default", size: "default" },
};

export const Outline: Story = {
  args: { children: "Button", variant: "outline", size: "default" },
};

export const Secondary: Story = {
  args: { children: "Button", variant: "secondary", size: "default" },
};

export const Ghost: Story = {
  args: { children: "Button", variant: "ghost", size: "default" },
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive", size: "default" },
};

export const Link: Story = {
  args: { children: "Learn more", variant: "link", size: "default" },
};

export const Tertiary: Story = {
  args: { children: "Cancel", variant: "tertiary", size: "default" },
};

export const Warning: Story = {
  args: { children: "Warning", variant: "warning", size: "default" },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="tiny">Tiny</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

// ─── Shapes ───────────────────────────────────────────────────────────────────

export const Shapes: Story = {
  name: "Shapes (square & circle)",
  render: () => (
    <div className="flex items-center gap-3">
      <Button shape="square" aria-label="Add">
        <Plus />
      </Button>
      <Button shape="circle" aria-label="Add">
        <Plus />
      </Button>
      <Button shape="square" size="sm" aria-label="Settings">
        <Settings />
      </Button>
      <Button shape="circle" size="lg" aria-label="Search">
        <Search />
      </Button>
      <Button shape="circle" size="tiny" aria-label="Add">
        <Plus />
      </Button>
    </div>
  ),
};

// ─── Shadow ───────────────────────────────────────────────────────────────────

export const WithShadow: Story = {
  name: "With Shadow",
  render: () => (
    <div className="flex items-center gap-3">
      <Button shadow="sm">Shadow SM</Button>
      <Button shadow>Shadow MD</Button>
      <Button shadow="lg">Shadow LG</Button>
      <Button shadow variant="outline">
        Outline + Shadow
      </Button>
    </div>
  ),
};

// ─── Prefix & Suffix ─────────────────────────────────────────────────────────

export const PrefixSuffix: Story = {
  name: "Prefix & Suffix Icons",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button prefix={<Mail />}>Login with Email</Button>
        <Button suffix={<ArrowRight />}>Continue</Button>
        <Button prefix={<Search />} suffix={<Command />}>
          Search
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button prefix={<Plus />} size="tiny">
          Add
        </Button>
        <Button prefix={<Plus />} size="sm">
          Add
        </Button>
        <Button prefix={<Plus />} size="lg">
          Add
        </Button>
      </div>
    </div>
  ),
};

// ─── States ───────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: { children: "Button", disabled: true },
};

export const Loading: Story = {
  args: { children: "Saving…", loading: true, variant: "default" },
};

export const LoadingVariants: Story = {
  name: "Loading States",
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading>Saving…</Button>
      <Button loading variant="outline">
        Uploading…
      </Button>
      <Button loading size="sm">
        Loading
      </Button>
      <Button loading size="lg">
        Processing…
      </Button>
      <Button loading size="tiny">
        Wait
      </Button>
    </div>
  ),
};

// ─── ButtonLink ───────────────────────────────────────────────────────────────

export const LinkButton: Story = {
  name: "ButtonLink Component",
  render: () => (
    <div className="flex items-center gap-3">
      <ButtonLink href="https://nebutra.com" variant="outline">
        Visit Nebutra
      </ButtonLink>
      <ButtonLink href="https://nebutra.com" variant="default" suffix={<ExternalLink />}>
        Open Link
      </ButtonLink>
      <ButtonLink href="https://nebutra.com" variant="tertiary" size="sm">
        Learn more
      </ButtonLink>
    </div>
  ),
};

// ─── All Variants Showcase ────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default">Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default" disabled>
          Default
        </Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
        <Button variant="secondary" disabled>
          Secondary
        </Button>
        <Button variant="ghost" disabled>
          Ghost
        </Button>
        <Button variant="tertiary" disabled>
          Tertiary
        </Button>
        <Button variant="warning" disabled>
          Warning
        </Button>
      </div>
    </div>
  ),
};
