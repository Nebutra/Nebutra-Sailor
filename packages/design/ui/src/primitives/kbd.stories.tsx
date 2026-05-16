import type { Meta, StoryObj } from "@storybook/react";
import { Kbd } from "./kbd";

const meta = {
  title: "Primitives/Kbd",
  component: Kbd,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Keyboard shortcut hint for prose, menu items, and button suffixes. Modifier props render platform-aware glyphs.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Modifiers: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd meta />
      <Kbd shift />
      <Kbd alt />
      <Kbd ctrl />
    </div>
  ),
};

export const Combination: Story = {
  render: () => <Kbd meta shift />,
};

export const Small: Story = {
  render: () => <Kbd small>/</Kbd>,
};

export const NamedKeys: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd>Enter</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd>Space</Kbd>
    </div>
  ),
};

export const WithKey: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd meta>K</Kbd>
      <Kbd shift>Tab</Kbd>
      <Kbd alt>Enter</Kbd>
      <Kbd ctrl>C</Kbd>
    </div>
  ),
};

export const DenseSurface: Story = {
  render: () => (
    <div className="flex w-80 items-center justify-between rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm">
      <span>Open Command Menu</span>
      <span className="flex items-center gap-1">
        <Kbd small meta />
        <Kbd small>K</Kbd>
      </span>
    </div>
  ),
};

export const InProse: Story = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      Press <Kbd meta>K</Kbd> to open the command menu.
    </p>
  ),
};
