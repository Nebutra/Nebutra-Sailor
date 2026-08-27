import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "./box";

const meta = {
  title: "Primitives/Box",
  component: Box,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Fundamental polymorphic layout primitive with token-based spacing props that map to the design system spacing scale.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    p: {
      control: { type: "select" },
      options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
    px: {
      control: { type: "select" },
      options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
    py: {
      control: { type: "select" },
      options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box p={4} className="border rounded-lg bg-muted/20 w-64">
      Box with padding on all sides (p=4)
    </Box>
  ),
};

export const AsymmetricSpacing: Story = {
  render: () => (
    <Box px={8} py={2} className="border rounded bg-primary/10 w-64 text-center">
      px=8 py=2
    </Box>
  ),
};

export const NestedBoxes: Story = {
  render: () => (
    <Box p={6} className="border rounded-lg bg-muted/10 w-80">
      <Box p={4} className="border rounded bg-muted/20 mb-3">
        Inner Box A (p=4)
      </Box>
      <Box px={4} py={2} className="border rounded bg-muted/20">
        Inner Box B (px=4, py=2)
      </Box>
    </Box>
  ),
};

export const AsSection: Story = {
  render: () => (
    <Box as="section" p={8} className="border rounded-xl max-w-sm bg-background">
      <Box as="article" p={4} className="rounded bg-muted/20 text-sm">
        Rendered as &lt;section&gt; containing &lt;article&gt;
      </Box>
    </Box>
  ),
};

export const MarginControl: Story = {
  render: () => (
    <div className="border rounded p-2 w-96 bg-muted/10">
      <Box mt={4} mb={4} mx={8} className="border rounded bg-primary/10 p-2 text-center text-sm">
        mt=4 mb=4 mx=8
      </Box>
      <Box className="border rounded bg-muted/20 p-2 text-center text-sm">No margin</Box>
    </div>
  ),
};
