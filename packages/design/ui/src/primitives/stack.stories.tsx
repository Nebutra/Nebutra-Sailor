import type { Meta, StoryObj } from "@storybook/react";
import { Stack } from "./stack";

const meta = {
  title: "Primitives/Stack",
  component: Stack,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Vertical layout primitive. Arranges children in a column with configurable gap, horizontal alignment, and vertical justification.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    gap: {
      control: { type: "select" },
      options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "stretch"],
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between", "around"],
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Stack gap={4} className="w-64 border rounded-lg p-4">
      <div className="rounded bg-muted/30 p-2 text-sm">Item 1</div>
      <div className="rounded bg-muted/30 p-2 text-sm">Item 2</div>
      <div className="rounded bg-muted/30 p-2 text-sm">Item 3</div>
    </Stack>
  ),
};

export const FormLayout: Story = {
  render: () => (
    <Stack gap={4} className="w-72 border rounded-lg p-6">
      <Stack gap={1}>
        <label className="text-sm font-medium">Email</label>
        <div className="border rounded px-3 py-2 text-sm text-muted-foreground">
          user@example.com
        </div>
      </Stack>
      <Stack gap={1}>
        <label className="text-sm font-medium">Password</label>
        <div className="border rounded px-3 py-2 text-sm text-muted-foreground">••••••••</div>
      </Stack>
      <div className="rounded bg-primary px-4 py-2 text-center text-sm text-primary-foreground cursor-pointer">
        Sign in
      </div>
    </Stack>
  ),
};

export const CenteredCard: Story = {
  render: () => (
    <Stack gap={3} align="center" className="w-48 border rounded-xl p-6">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/60" />
      <Stack gap={0.5} align="center">
        <span className="font-semibold text-sm">Jane Doe</span>
        <span className="text-xs text-muted-foreground">Product Designer</span>
      </Stack>
      <div className="border rounded-full px-4 py-1 text-xs cursor-pointer">Follow</div>
    </Stack>
  ),
};

export const TightSpacing: Story = {
  render: () => (
    <Stack gap={1} className="w-64 border rounded-lg p-4">
      <span className="text-xs text-muted-foreground">NAVIGATION</span>
      {["Dashboard", "Analytics", "Settings", "Help"].map((item) => (
        <div key={item} className="rounded px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
          {item}
        </div>
      ))}
    </Stack>
  ),
};

export const WideSpacing: Story = {
  render: () => (
    <Stack gap={8} className="w-64">
      <div className="border rounded-lg p-4 text-center text-sm">Section A</div>
      <div className="border rounded-lg p-4 text-center text-sm">Section B</div>
      <div className="border rounded-lg p-4 text-center text-sm">Section C</div>
    </Stack>
  ),
};
