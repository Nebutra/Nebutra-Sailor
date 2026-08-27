import { Copy, Download, Pencil as Edit2, External, Link } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import type * as React from "react";
import { ContextMenu } from "./context-menu";

const meta = {
  title: "Primitives/ContextMenu",
  component: ContextMenu.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Pointer-positioned context menu for secondary shortcuts on a row, file, canvas object, or deployment. Built on Base UI and mirrored by visible actions in product surfaces.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextMenu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerArea({
  children = "Right-click here",
  label = "Deployment row actions",
}: {
  children?: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-36 w-72 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-background text-sm text-muted-foreground select-none"
    >
      {children}
    </button>
  );
}

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <TriggerArea />
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item value="open" onSelect={() => {}}>
          Open Deployment
        </ContextMenu.Item>
        <ContextMenu.Item value="copy" onSelect={() => {}}>
          Copy URL
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item value="delete" variant="destructive" onSelect={() => {}}>
          Delete Deployment
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Deployment row actions" });
    await userEvent.pointer({ keys: "[MouseRight]", target: trigger });
    expect(await within(document.body).findByText("Open Deployment")).toBeVisible();
  },
};

export const DisabledItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <TriggerArea />
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item value="open" onSelect={() => {}}>
          Open Deployment
        </ContextMenu.Item>
        <ContextMenu.Item disabled value="promote" onSelect={() => {}}>
          Promote to Production
        </ContextMenu.Item>
        <ContextMenu.Item disabled value="rollback" onSelect={() => {}}>
          Roll Back Deployment
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item value="delete" variant="destructive" onSelect={() => {}}>
          Delete Deployment
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ),
};

export const LinkItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <TriggerArea />
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item href="#deployment" prefix={<External className="size-4" />} value="open">
          Open in New Tab
        </ContextMenu.Item>
        <ContextMenu.Item href="#docs" prefix={<Link className="size-4" />} value="docs">
          View Documentation
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ),
};

export const PrefixAndSuffix: Story = {
  render: () => (
    <div className="flex flex-col items-stretch gap-6 md:flex-row">
      <ContextMenu>
        <ContextMenu.Trigger asChild>
          <TriggerArea>Prefix icons</TriggerArea>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item
            prefix={<Edit2 className="size-4" />}
            value="rename"
            onSelect={() => {}}
          >
            Rename Deployment...
          </ContextMenu.Item>
          <ContextMenu.Item prefix={<Copy className="size-4" />} value="copy" onSelect={() => {}}>
            Copy URL
          </ContextMenu.Item>
          <ContextMenu.Item
            prefix={<Download className="size-4" />}
            value="download"
            onSelect={() => {}}
          >
            Download Logs
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
      <ContextMenu>
        <ContextMenu.Trigger asChild>
          <TriggerArea>Shortcut suffixes</TriggerArea>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item value="rename" onSelect={() => {}}>
            Rename Deployment...
            <ContextMenu.Shortcut>R</ContextMenu.Shortcut>
          </ContextMenu.Item>
          <ContextMenu.Item value="copy" onSelect={() => {}}>
            Copy URL
            <ContextMenu.Shortcut>⌘C</ContextMenu.Shortcut>
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item value="delete" variant="destructive" onSelect={() => {}}>
            Delete Deployment
            <ContextMenu.Shortcut>⌫</ContextMenu.Shortcut>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    </div>
  ),
};

export const CheckboxAndRadioItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Selection items</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>Columns</ContextMenu.Label>
        <ContextMenu.CheckboxItem defaultChecked value="status">
          Status
        </ContextMenu.CheckboxItem>
        <ContextMenu.CheckboxItem value="owner">Owner</ContextMenu.CheckboxItem>
        <ContextMenu.Separator />
        <ContextMenu.Label>Density</ContextMenu.Label>
        <ContextMenu.RadioGroup defaultValue="comfortable">
          <ContextMenu.RadioItem value="compact">Compact</ContextMenu.RadioItem>
          <ContextMenu.RadioItem value="comfortable">Comfortable</ContextMenu.RadioItem>
        </ContextMenu.RadioGroup>
      </ContextMenu.Content>
    </ContextMenu>
  ),
};

export const Submenu: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <TriggerArea>Nested actions</TriggerArea>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item value="open" onSelect={() => {}}>
          Open Deployment
        </ContextMenu.Item>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Move to Project</ContextMenu.SubTrigger>
          <ContextMenu.SubContent sideOffset={6}>
            <ContextMenu.Item value="core">Core Platform</ContextMenu.Item>
            <ContextMenu.Item value="growth">Growth Lab</ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      </ContextMenu.Content>
    </ContextMenu>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-6 text-foreground">
      <ContextMenu>
        <ContextMenu.Trigger asChild>
          <TriggerArea />
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item value="open">Open Deployment</ContextMenu.Item>
          <ContextMenu.Item value="copy">Copy URL</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item value="delete" variant="destructive">
            Delete Deployment
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
    </div>
  ),
};
