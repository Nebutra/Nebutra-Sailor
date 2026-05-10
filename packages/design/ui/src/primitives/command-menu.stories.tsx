import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "./button";
import { CommandMenu } from "./command-menu";

const meta = {
  title: "Primitives/CommandMenu",
  component: CommandMenu,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Full-screen command palette overlay built on Dialog + cmdk. " +
          "Triggered by a button or keyboard shortcut. " +
          "Supports grouping, shortcuts, separators, and disabled items.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CommandMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [open, setOpen] = useState(false);

    function noop(): void {
      setOpen(false);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
        <CommandMenu.Root open={open} setOpen={setOpen}>
          <CommandMenu.Input placeholder="What do you need?" />
          <CommandMenu.List>
            <CommandMenu.Group heading="Suggestions">
              <CommandMenu.Item callback={noop}>Figma Import</CommandMenu.Item>
            </CommandMenu.Group>
            <CommandMenu.Group heading="Commands">
              <CommandMenu.Item callback={noop}>Import Extension</CommandMenu.Item>
              <CommandMenu.Item callback={noop}>Manage Extensions</CommandMenu.Item>
            </CommandMenu.Group>
            <CommandMenu.Group heading="Collaboration">
              <CommandMenu.Item callback={noop}>Flags Explorer</CommandMenu.Item>
            </CommandMenu.Group>
          </CommandMenu.List>
        </CommandMenu.Root>
      </>
    );
  },
};

export const WithSeparators: Story = {
  render: function SeparatorsStory() {
    const [open, setOpen] = useState(false);
    function noop(): void {
      setOpen(false);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
        <CommandMenu.Root open={open} setOpen={setOpen}>
          <CommandMenu.Input placeholder="Search commands..." />
          <CommandMenu.List>
            <CommandMenu.Group heading="Files">
              <CommandMenu.Item callback={noop}>New File</CommandMenu.Item>
              <CommandMenu.Item callback={noop}>Open File</CommandMenu.Item>
            </CommandMenu.Group>
            <CommandMenu.Separator />
            <CommandMenu.Group heading="Edit">
              <CommandMenu.Item callback={noop}>Copy</CommandMenu.Item>
              <CommandMenu.Item callback={noop}>Paste</CommandMenu.Item>
            </CommandMenu.Group>
            <CommandMenu.Separator />
            <CommandMenu.Group heading="View">
              <CommandMenu.Item callback={noop}>Toggle Sidebar</CommandMenu.Item>
            </CommandMenu.Group>
          </CommandMenu.List>
        </CommandMenu.Root>
      </>
    );
  },
};

export const WithShortcuts: Story = {
  render: function ShortcutsStory() {
    const [open, setOpen] = useState(false);
    function noop(): void {
      setOpen(false);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
        <CommandMenu.Root open={open} setOpen={setOpen}>
          <CommandMenu.Input placeholder="Search commands..." />
          <CommandMenu.List>
            <CommandMenu.Group heading="Actions">
              <CommandMenu.Item callback={noop}>
                New File
                <CommandMenu.Shortcut>⌘N</CommandMenu.Shortcut>
              </CommandMenu.Item>
              <CommandMenu.Item callback={noop}>
                Save
                <CommandMenu.Shortcut>⌘S</CommandMenu.Shortcut>
              </CommandMenu.Item>
              <CommandMenu.Item callback={noop}>
                Find
                <CommandMenu.Shortcut>⌘F</CommandMenu.Shortcut>
              </CommandMenu.Item>
            </CommandMenu.Group>
          </CommandMenu.List>
        </CommandMenu.Root>
      </>
    );
  },
};

export const DisabledItems: Story = {
  render: function DisabledStory() {
    const [open, setOpen] = useState(false);
    function noop(): void {
      setOpen(false);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
        <CommandMenu.Root open={open} setOpen={setOpen}>
          <CommandMenu.Input placeholder="Search commands..." />
          <CommandMenu.List>
            <CommandMenu.Group heading="Commands">
              <CommandMenu.Item callback={noop}>Available Action</CommandMenu.Item>
              <CommandMenu.Item disabled callback={noop}>
                Disabled Action
              </CommandMenu.Item>
              <CommandMenu.Item callback={noop}>Another Available</CommandMenu.Item>
            </CommandMenu.Group>
          </CommandMenu.List>
        </CommandMenu.Root>
      </>
    );
  },
};

export const EmptyState: Story = {
  render: function EmptyStory() {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
        <CommandMenu.Root open={open} setOpen={setOpen}>
          <CommandMenu.Input placeholder="Try searching anything..." />
          <CommandMenu.List>
            <CommandMenu.Empty>No commands found.</CommandMenu.Empty>
          </CommandMenu.List>
        </CommandMenu.Root>
      </>
    );
  },
};
