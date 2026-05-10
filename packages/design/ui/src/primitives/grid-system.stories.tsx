import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { Grid } from "./grid-system";

const meta = {
  title: "Primitives/Grid",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Display elements in a grid layout with optional column and row guide lines.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Helper — a simple cell with a label
// =============================================================================

function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center p-4 text-sm text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Default — empty grid with guides visible
// =============================================================================

export const Default: Story = {
  render: () => (
    <Grid.System columns={12} rowHeight="3rem">
      {Array.from({ length: 12 }).map((_, i) => (
        <Grid.Cell key={i} />
      ))}
    </Grid.System>
  ),
};

// =============================================================================
// BasicGrid — numbered cells auto-flowing
// =============================================================================

export const BasicGrid: Story = {
  render: () => (
    <Grid.System columns={3}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Grid.Cell key={n}>
          <Cell>{n}</Cell>
        </Grid.Cell>
      ))}
    </Grid.System>
  ),
};

// =============================================================================
// SolidCells — cells with bg-muted fill that "covers" guides
// =============================================================================

export const SolidCells: Story = {
  render: () => (
    <Grid.System columns={3}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Grid.Cell key={n} solid>
          <Cell>{n}</Cell>
        </Grid.Cell>
      ))}
    </Grid.System>
  ),
};

// =============================================================================
// SpanningCells — cells that span multiple columns
// =============================================================================

export const SpanningCells: Story = {
  render: () => (
    <Grid.System columns={12}>
      <Grid.Cell span={8}>
        <Cell>span 8</Cell>
      </Grid.Cell>
      <Grid.Cell span={4}>
        <Cell>span 4</Cell>
      </Grid.Cell>
      <Grid.Cell span={4}>
        <Cell>span 4</Cell>
      </Grid.Cell>
      <Grid.Cell span={4}>
        <Cell>span 4</Cell>
      </Grid.Cell>
      <Grid.Cell span={4}>
        <Cell>span 4</Cell>
      </Grid.Cell>
      <Grid.Cell span={6}>
        <Cell>span 6</Cell>
      </Grid.Cell>
      <Grid.Cell span={6}>
        <Cell>span 6</Cell>
      </Grid.Cell>
    </Grid.System>
  ),
};

// =============================================================================
// HideRowGuides — remove top/bottom guide lines on specific cells
// =============================================================================

export const HideRowGuides: Story = {
  render: () => (
    <Grid.System columns={3}>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
      <Grid.Cell hideRowGuides="top">
        <Cell>hide top</Cell>
      </Grid.Cell>
      <Grid.Cell hideRowGuides="bottom">
        <Cell>hide bottom</Cell>
      </Grid.Cell>
      <Grid.Cell hideRowGuides>
        <Cell>hide both</Cell>
      </Grid.Cell>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
    </Grid.System>
  ),
};

// =============================================================================
// HideColumnGuides — remove left/right guide lines on specific cells
// =============================================================================

export const HideColumnGuides: Story = {
  render: () => (
    <Grid.System columns={3}>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
      <Grid.Cell hideColumnGuides="left">
        <Cell className="border-l-0">hide left</Cell>
      </Grid.Cell>
      <Grid.Cell hideColumnGuides="right">
        <Cell>hide right</Cell>
      </Grid.Cell>
      <Grid.Cell hideColumnGuides>
        <Cell>hide both</Cell>
      </Grid.Cell>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
      <Grid.Cell>
        <Cell>normal</Cell>
      </Grid.Cell>
    </Grid.System>
  ),
};

// =============================================================================
// NoGuides — showGuides=false for plain CSS grid
// =============================================================================

export const NoGuides: Story = {
  render: () => (
    <Grid.System columns={3} showGuides={false} className="gap-4">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Grid.Cell key={n} solid className="rounded-lg">
          <Cell>{n}</Cell>
        </Grid.Cell>
      ))}
    </Grid.System>
  ),
};
