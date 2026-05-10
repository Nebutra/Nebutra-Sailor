import type { Meta, StoryObj } from "@storybook/react";
import { ProgressiveBlur } from "./progressive-blur";

const meta = {
  title: "Primitives/ProgressiveBlur",
  component: ProgressiveBlur,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Multi-layered backdrop blur that transitions smoothly from clear to frosted. Indicates scrollable content and creates elegant overflow fade effects.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    position: {
      control: "select",
      options: ["top", "bottom", "both"],
    },
    height: { control: "text" },
  },
} satisfies Meta<typeof ProgressiveBlur>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BottomFade: Story = {
  render: () => (
    <div className="relative h-[300px] w-[400px] overflow-hidden rounded-xl border bg-background">
      <div className="space-y-3 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted" />
        ))}
      </div>
      <ProgressiveBlur position="bottom" height="40%" />
    </div>
  ),
};

export const TopFade: Story = {
  render: () => (
    <div className="relative h-[300px] w-[400px] overflow-hidden rounded-xl border bg-background">
      <ProgressiveBlur position="top" height="40%" />
      <div className="space-y-3 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  ),
};

export const BothEnds: Story = {
  render: () => (
    <div className="relative h-[300px] w-[400px] overflow-hidden rounded-xl border bg-background">
      <ProgressiveBlur position="both" />
      <div className="space-y-3 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  ),
};

export const WithCTA: Story = {
  name: "With See-More Button",
  render: () => (
    <div className="relative h-[250px] w-[400px] overflow-hidden rounded-xl border bg-background">
      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted" />
        ))}
      </div>
      <ProgressiveBlur position="bottom" height="50%">
        <button
          type="button"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
        >
          Show more
        </button>
      </ProgressiveBlur>
    </div>
  ),
};
