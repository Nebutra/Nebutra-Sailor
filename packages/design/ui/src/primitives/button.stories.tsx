import {
  ArrowRight,
  Bell,
  Command,
  External as ExternalLink,
  Envelope as Mail,
  Plus,
  MagnifyingGlass as Search,
  SettingsGear as Settings,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
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
        "ink",
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
      options: ["default", "square", "circle", "pill"],
      description: "Button shape",
    },
    iconSize: {
      control: "select",
      options: [undefined, "sm", "md", "lg"],
      description:
        'Icon-only box size — 28/32/36px. Independent of `size`; only takes effect with shape="square" or shape="circle".',
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

export const Ink: Story = {
  args: { variant: "ink", children: "Ship to production" },
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
  name: "Shapes (square, circle & pill)",
  render: () => (
    <div className="flex flex-col gap-4">
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
      <div className="flex flex-wrap items-center gap-3">
        {/* pill — auto-width, hug-content, rounded-full. Use for a stateless
            action chip (e.g. a one-shot suggestion or filter shortcut) —
            NOT a selectable state, that's ToggleGroup variant="pill" or
            FilterPills. */}
        <Button shape="pill" size="tiny" variant="tertiary">
          Suggest a title
        </Button>
        <Button shape="pill" size="sm" variant="outline">
          Try an example
        </Button>
        <Button shape="pill" variant="secondary">
          Regular pill
        </Button>
      </div>
    </div>
  ),
};

// ─── Icon-only triggers (iconSize) ─────────────────────────────────────────────
// The size that actually recurs across apps/web is 28 / 32 / 36px rounded-square
// icon triggers — none of which is one of the text-button heights (24/32/40/48).
// `iconSize` is the dedicated scale for that: independent of `size`, only takes
// effect combined with shape="square" or shape="circle".

export const IconOnly: Story = {
  name: "Icon-only (iconSize)",
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          shape=&quot;square&quot; + iconSize, beside the text button its box height matches
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button shape="square" iconSize="sm" aria-label="Add">
              <Plus />
            </Button>
            <span className="text-xs text-muted-foreground">sm · 28px</span>
          </div>
          <div className="flex items-center gap-2">
            <Button shape="square" iconSize="md" aria-label="Add">
              <Plus />
            </Button>
            <span className="text-xs text-muted-foreground">md · 32px</span>
          </div>
          <div className="flex items-center gap-2">
            <Button shape="square" iconSize="lg" aria-label="Add">
              <Plus />
            </Button>
            <span className="text-xs text-muted-foreground">lg · 36px</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              Text sm
            </Button>
            <span className="text-xs text-muted-foreground">for comparison — 32px tall</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">shape=&quot;circle&quot; + iconSize</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button shape="circle" iconSize="sm" variant="outline" aria-label="Add">
            <Plus />
          </Button>
          <Button shape="circle" iconSize="md" variant="outline" aria-label="Add">
            <Plus />
          </Button>
          <Button shape="circle" iconSize="lg" variant="outline" aria-label="Add">
            <Plus />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          badge overlay — the recurring notifications-bell shape (32px trigger, absolutely
          positioned count badge)
        </p>
        <div className="flex items-center gap-4">
          <Button
            shape="square"
            iconSize="md"
            variant="ghost"
            aria-label="Notifications"
            className="relative"
          >
            <Bell />
            <span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              3
            </span>
          </Button>
          <Button
            shape="circle"
            iconSize="md"
            variant="outline"
            aria-label="Notifications"
            className="relative"
          >
            <Bell />
            <span className="-right-1 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              9+
            </span>
          </Button>
        </div>
      </div>
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
