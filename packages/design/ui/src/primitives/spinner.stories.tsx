import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./spinner";

const meta = {
  title: "Primitives/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Multi-variant loading spinner extending LucideProps. Includes Lucide icon variants (default, circle, pinwheel) and custom SVG variants (ellipsis, ring, bars, infinite).",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "circle",
        "pinwheel",
        "circle-filled",
        "ellipsis",
        "ring",
        "bars",
        "infinite",
      ],
    },
    size: { control: { type: "range", min: 12, max: 64, step: 4 } },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-8 p-8">
      {(
        [
          "default",
          "circle",
          "pinwheel",
          "circle-filled",
          "ellipsis",
          "ring",
          "bars",
          "infinite",
        ] as const
      ).map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-2">
          <Spinner variant={variant} size={24} />
          <span className="text-xs text-muted-foreground text-center">{variant}</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      {[16, 24, 32, 48].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} />
          <span className="text-xs text-muted-foreground">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Colored: Story = {
  render: () => (
    <div className="flex gap-6">
      <Spinner size={32} className="text-primary" />
      <Spinner variant="ring" size={32} className="text-blue-500" />
      <Spinner variant="bars" size={32} className="text-green-500" />
      <Spinner variant="infinite" size={32} className="text-purple-500" />
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground opacity-80 cursor-not-allowed"
      >
        <Spinner size={16} className="text-primary-foreground" />
        Loading...
      </button>
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-not-allowed"
      >
        <Spinner variant="circle" size={16} />
        Saving
      </button>
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground opacity-80 cursor-not-allowed"
      >
        <Spinner variant="ellipsis" size={20} className="text-destructive-foreground" />
        Deleting
      </button>
    </div>
  ),
};

export const RingPulse: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <Spinner variant="ring" size={64} className="text-primary" />
      <span className="text-sm text-muted-foreground">Ring variant — expanding sonar pulse</span>
    </div>
  ),
};

export const InfiniteSymbol: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <Spinner variant="infinite" size={64} className="text-primary" />
      <span className="text-sm text-muted-foreground">Infinite variant — traced infinity path</span>
    </div>
  ),
};
