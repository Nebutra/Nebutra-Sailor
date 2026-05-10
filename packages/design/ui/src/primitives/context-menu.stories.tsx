import type { Meta, StoryObj } from "@storybook/react";
import { Copy, Download, Edit2, Link, MoreHorizontal, Trash2 } from "lucide-react";
import type * as React from "react";
import { ContextMenu } from "./context-menu";

const meta = {
  title: "Primitives/ContextMenu",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Right-click context menu built on Radix ContextMenu. " +
          "Supports items with prefix icons, suffix hints, disabled states, and link mode.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-36 w-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground select-none">
      {children}
    </div>
  );
}

// =============================================================================
// Default
// =============================================================================

export const Default: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click here</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => {}}>Edit</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => {}}>Duplicate</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => {}}>Delete</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};

// =============================================================================
// WithPrefixIcons
// =============================================================================

export const WithPrefixIcons: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click for icon menu</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item prefix={<Edit2 className="h-4 w-4" />} onSelect={() => {}}>
          Edit
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Copy className="h-4 w-4" />} onSelect={() => {}}>
          Copy
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Link className="h-4 w-4" />} onSelect={() => {}}>
          Copy Link
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Download className="h-4 w-4" />} onSelect={() => {}}>
          Download
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};

// =============================================================================
// WithSuffixHints
// =============================================================================

export const WithSuffixHints: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click for shortcuts</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item
          prefix={<Edit2 className="h-4 w-4" />}
          suffix={<span className="text-xs text-muted-foreground">⌘E</span>}
          onSelect={() => {}}
        >
          Edit
        </ContextMenu.Item>
        <ContextMenu.Item
          prefix={<Copy className="h-4 w-4" />}
          suffix={<span className="text-xs text-muted-foreground">⌘C</span>}
          onSelect={() => {}}
        >
          Copy
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          prefix={<Trash2 className="h-4 w-4" />}
          suffix={<span className="text-xs text-muted-foreground">⌫</span>}
          onSelect={() => {}}
        >
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};

// =============================================================================
// WithLabel
// =============================================================================

export const WithLabel: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click for grouped menu</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>Actions</ContextMenu.Label>
        <ContextMenu.Item prefix={<Edit2 className="h-4 w-4" />} onSelect={() => {}}>
          Edit
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Copy className="h-4 w-4" />} onSelect={() => {}}>
          Copy
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Label>Danger</ContextMenu.Label>
        <ContextMenu.Item
          prefix={<Trash2 className="h-4 w-4" />}
          onSelect={() => {}}
          className="text-destructive focus:text-destructive"
        >
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};

// =============================================================================
// DisabledItems
// =============================================================================

export const DisabledItems: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click (some items disabled)</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => {}}>Edit</ContextMenu.Item>
        <ContextMenu.Item disabled onSelect={() => {}}>
          Copy (disabled)
        </ContextMenu.Item>
        <ContextMenu.Item disabled onSelect={() => {}}>
          Paste (disabled)
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item onSelect={() => {}}>Delete</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};

// =============================================================================
// LinkMode
// =============================================================================

export const LinkMode: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Right-click for links</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item prefix={<MoreHorizontal className="h-4 w-4" />} href="#more">
          More Info
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Link className="h-4 w-4" />} href="#docs">
          Documentation
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};
