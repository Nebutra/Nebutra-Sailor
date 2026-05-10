import type { Meta, StoryObj } from "@storybook/react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Lightweight contextual overlay for quick actions and compact inspector content.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-md border border-border px-3 py-2 text-sm">
          Open popover
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <p className="text-sm font-medium text-foreground">API key scope</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Restrict this key to analytics read-only access.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
