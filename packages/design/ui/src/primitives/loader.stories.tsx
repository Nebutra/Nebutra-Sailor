import type { Meta, StoryObj } from "@storybook/react";
import { Loader } from "./loader";

const meta = {
  title: "Primitives/Loader",
  component: Loader,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Universal loading indicator with 12 visual variants. Includes graphic loaders (circular, classic, wave, bars) and text-based loaders (text-blink, text-shimmer, loading-dots) for AI contexts.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "circular",
        "classic",
        "pulse",
        "pulse-dot",
        "dots",
        "typing",
        "wave",
        "bars",
        "terminal",
        "text-blink",
        "text-shimmer",
        "loading-dots",
      ],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    text: { control: "text" },
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-8 p-8">
      {(
        [
          "circular",
          "classic",
          "pulse",
          "pulse-dot",
          "dots",
          "typing",
          "wave",
          "bars",
          "terminal",
        ] as const
      ).map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-2">
          <Loader variant={variant} size="md" />
          <span className="text-xs text-muted-foreground">{variant}</span>
        </div>
      ))}
    </div>
  ),
};

export const TextVariants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6 p-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground mb-1">text-blink</span>
        <Loader variant="text-blink" text="Thinking" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground mb-1">text-shimmer</span>
        <Loader variant="text-shimmer" text="Generating" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground mb-1">loading-dots</span>
        <Loader variant="loading-dots" text="Processing" />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <Loader variant="circular" size="sm" />
        <span className="text-xs text-muted-foreground">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loader variant="circular" size="md" />
        <span className="text-xs text-muted-foreground">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loader variant="circular" size="lg" />
        <span className="text-xs text-muted-foreground">lg</span>
      </div>
    </div>
  ),
};

export const AIContext: Story = {
  render: () => (
    <div className="rounded-xl border bg-muted/20 p-6 w-72 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
          AI
        </div>
        <Loader variant="loading-dots" text="Thinking" size="md" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
          AI
        </div>
        <Loader variant="text-shimmer" text="Generating response" size="md" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
          AI
        </div>
        <Loader variant="terminal" size="md" />
      </div>
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <div className="flex gap-4">
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground opacity-80 cursor-not-allowed"
      >
        <Loader variant="circular" size="sm" className="text-primary-foreground" />
        Saving...
      </button>
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-not-allowed"
      >
        <Loader variant="dots" size="sm" />
        Loading
      </button>
    </div>
  ),
};
