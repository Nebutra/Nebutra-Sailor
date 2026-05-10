import type { Meta, StoryObj } from "@storybook/react";
import { Gauge } from "./gauge";

const meta = {
  title: "Primitives/Gauge",
  component: Gauge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "A circular visual for conveying a percentage.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Gauge>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Default — auto color scale, no label
// =============================================================================

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Gauge size={48} value={0} />
      <Gauge size={48} value={25} />
      <Gauge size={48} value={50} />
      <Gauge size={48} value={75} />
      <Gauge size={48} value={100} />
    </div>
  ),
};

// =============================================================================
// Label — numeric value shown in center
// =============================================================================

export const Label: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Gauge size={36} value={20} label />
      <Gauge size={48} value={50} label />
      <Gauge size={64} value={80} label />
      <Gauge size={80} value={100} label />
    </div>
  ),
};

// =============================================================================
// DefaultColorScale — auto colors at 0 / 40 / 75 thresholds
// =============================================================================

export const DefaultColorScale: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {[0, 20, 40, 60, 75, 90, 100].map((v) => (
        <Gauge key={v} size={48} value={v} label />
      ))}
    </div>
  ),
};

// =============================================================================
// CustomColorRange — custom thresholds + hex colors
// =============================================================================

const customColors = [
  { value: 0, color: "#ef4444" }, // red
  { value: 25, color: "#f97316" }, // orange
  { value: 50, color: "#eab308" }, // yellow
  { value: 75, color: "#22c55e" }, // green
  { value: 90, color: "#3b82f6" }, // blue
];

export const CustomColorRange: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {[0, 25, 50, 75, 90, 100].map((v) => (
        <Gauge key={v} size={48} value={v} colors={customColors} label />
      ))}
    </div>
  ),
};

// =============================================================================
// CustomSecondaryColor — custom track / background arc color
// =============================================================================

export const CustomSecondaryColor: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Gauge size={64} value={60} secondaryColor="#dbeafe" label />
      <Gauge size={64} value={60} secondaryColor="#fce7f3" label />
      <Gauge size={64} value={60} secondaryColor="#dcfce7" label />
    </div>
  ),
};

// =============================================================================
// ArcPriority — controls which ring renders on top
// =============================================================================

export const ArcPriority: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <Gauge size={64} value={60} arcPriority="value" label />
        <span className="text-xs text-muted-foreground">value (default)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Gauge size={64} value={60} arcPriority="secondary" label />
        <span className="text-xs text-muted-foreground">secondary</span>
      </div>
    </div>
  ),
};

// =============================================================================
// Indeterminate — spinning animation
// =============================================================================

export const Indeterminate: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Gauge size={36} indeterminate />
      <Gauge size={48} indeterminate />
      <Gauge size={64} indeterminate />
    </div>
  ),
};

// =============================================================================
// Sizes — all sizes with label
// =============================================================================

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Gauge size={32} value={70} label />
      <Gauge size={48} value={70} label />
      <Gauge size={64} value={70} label />
      <Gauge size={96} value={70} label />
      <Gauge size={128} value={70} label />
    </div>
  ),
};
