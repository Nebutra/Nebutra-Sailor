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
          "Display keyboard input that triggers an action. Supports modifier symbols (⌘ ⇧ ⌥ ⌃), combinations, and a small size variant.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Modifiers ────────────────────────────────────────────────────────────────

export const Modifiers: Story = {
  name: "Modifiers",
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd meta />
      <Kbd shift />
      <Kbd alt />
      <Kbd ctrl />
    </div>
  ),
};

// ─── Combination ──────────────────────────────────────────────────────────────

export const Combination: Story = {
  name: "Combination",
  render: () => (
    <div className="flex items-center gap-4">
      <Kbd meta shift />
      <Kbd ctrl alt />
      <Kbd meta shift alt />
    </div>
  ),
};

// ─── Small ────────────────────────────────────────────────────────────────────

export const Small: Story = {
  name: "Small",
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd small>/</Kbd>
      <Kbd small meta />
      <Kbd small shift />
      <Kbd small meta shift />
    </div>
  ),
};

// ─── With Text ────────────────────────────────────────────────────────────────

export const WithText: Story = {
  name: "With text content",
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd>Enter</Kbd>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd>Space</Kbd>
      <Kbd>⌘K</Kbd>
    </div>
  ),
};

// ─── Modifier + Text ──────────────────────────────────────────────────────────

export const ModifierWithText: Story = {
  name: "Modifier + text",
  render: () => (
    <div className="flex items-center gap-2">
      <Kbd meta>K</Kbd>
      <Kbd shift>Tab</Kbd>
      <Kbd ctrl>C</Kbd>
    </div>
  ),
};

// ─── In Context ───────────────────────────────────────────────────────────────

export const InContext: Story = {
  name: "In context",
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
      <p>
        Press <Kbd small meta /> <Kbd small>K</Kbd> to open the command menu.
      </p>
      <p>
        Use <Kbd small>⇧</Kbd> <Kbd small>Tab</Kbd> to navigate backwards.
      </p>
      <p>
        Hit <Kbd small>Esc</Kbd> to dismiss.
      </p>
    </div>
  ),
};
