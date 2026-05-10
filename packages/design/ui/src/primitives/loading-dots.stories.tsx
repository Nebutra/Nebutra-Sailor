import type { Meta, StoryObj } from "@storybook/react";
import { LoadingDots } from "./loading-dots";

const meta = {
  title: "Primitives/LoadingDots",
  component: LoadingDots,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Indicate an action running in the background. Three animated dots with a staggered fade-pulse effect.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LoadingDots>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: "Default",
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <LoadingDots />
      <LoadingDots size={4} />
    </div>
  ),
};

// ─── With Text ────────────────────────────────────────────────────────────────

export const WithText: Story = {
  name: "With text",
  render: () => (
    <LoadingDots size={4}>
      <p className="text-sm text-foreground">Loading</p>
    </LoadingDots>
  ),
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  name: "Sizes",
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <LoadingDots size={3} />
        <span className="text-xs text-muted-foreground">3px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingDots size={4} />
        <span className="text-xs text-muted-foreground">4px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingDots size={6} />
        <span className="text-xs text-muted-foreground">6px (default)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingDots size={8} />
        <span className="text-xs text-muted-foreground">8px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingDots size={10} />
        <span className="text-xs text-muted-foreground">10px</span>
      </div>
    </div>
  ),
};

// ─── In Context ───────────────────────────────────────────────────────────────

export const InContext: Story = {
  name: "In context",
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Saving changes</span>
        <LoadingDots size={4} />
      </div>
      <div className="flex items-center gap-2">
        <span>Deploying</span>
        <LoadingDots size={4} />
      </div>
      <div className="flex items-center gap-2">
        <span>Analyzing</span>
        <LoadingDots size={4} />
      </div>
    </div>
  ),
};

// ─── Color Inheritance ────────────────────────────────────────────────────────

export const ColorInheritance: Story = {
  name: "Color inheritance",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="text-foreground">
        <LoadingDots size={5} />
      </div>
      <div className="text-blue-500">
        <LoadingDots size={5} />
      </div>
      <div className="text-green-500">
        <LoadingDots size={5} />
      </div>
      <div className="text-destructive">
        <LoadingDots size={5} />
      </div>
    </div>
  ),
};
