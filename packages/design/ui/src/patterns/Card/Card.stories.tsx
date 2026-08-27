import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta = {
  title: "Patterns/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Flexible container following compound component pattern. Supports default/elevated/bordered/ghost/gradient variants with sm/md/lg padding presets.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "elevated", "bordered", "ghost", "gradient"],
      description: "Visual treatment variant",
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
      description: "Padding preset — maps to 16/24/32px from card tokens",
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Variants ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <Card variant="default" padding="md">
      <Card.Header>
        <Card.Title>Default Card</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          The default variant uses a subtle background with a thin border. Suitable for content
          areas and list items.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated" padding="md">
      <Card.Header>
        <Card.Title>Elevated Card</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          Box shadow adds depth. Use for dashboard panels and interactive surfaces that need visual
          hierarchy.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};

export const Bordered: Story = {
  render: () => (
    <Card variant="bordered" padding="md">
      <Card.Header>
        <Card.Title>Bordered Card</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          Prominent border with no shadow. Use for forms, settings panels, and table-adjacent
          content.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};

export const Ghost: Story = {
  render: () => (
    <Card variant="ghost" padding="md">
      <Card.Header>
        <Card.Title>Ghost Card</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          No border or shadow. Use for inline content groups that need spacing but not visual
          containment.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};

export const Gradient: Story = {
  render: () => (
    <Card variant="gradient" padding="md">
      <Card.Header>
        <Card.Title>Gradient Card</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          Brand gradient border. Use sparingly for featured or promotional content blocks.
        </Card.Description>
      </Card.Body>
    </Card>
  ),
};

// ─── Padding Sizes ────────────────────────────────────────────────────────────

export const PaddingSizes: Story = {
  name: "Padding Sizes",
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((p) => (
        <Card key={p} variant="bordered" padding={p}>
          <Card.Body>
            <p className="text-sm text-muted-foreground">padding="{p}"</p>
          </Card.Body>
        </Card>
      ))}
    </div>
  ),
};

// ─── With Footer ──────────────────────────────────────────────────────────────

export const WithFooter: Story = {
  render: () => (
    <Card variant="elevated" padding="md">
      <Card.Header>
        <Card.Title>Plan Summary</Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Description>
          You are on the <strong>Pro</strong> plan. Your next billing date is March 1, 2026.
        </Card.Description>
      </Card.Body>
      <Card.Footer>
        <p className="text-xs text-muted-foreground">Auto-renews unless cancelled</p>
      </Card.Footer>
    </Card>
  ),
};

// ─── All Variants Grid ────────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All Variants",
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(["default", "elevated", "bordered", "ghost", "gradient"] as const).map((v) => (
        <Card key={v} variant={v} padding="md">
          <Card.Header>
            <Card.Title className="capitalize">{v}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>variant="{v}"</Card.Description>
          </Card.Body>
        </Card>
      ))}
    </div>
  ),
};
