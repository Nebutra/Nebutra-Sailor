import type { Meta, StoryObj } from "@storybook/react";
import { AnimateIn, AnimateInGroup } from "./animate-in";

const meta: Meta<typeof AnimateIn> = {
  title: "Primitives/AnimateIn",
  component: AnimateIn,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Branded entrance animation built on framer-motion. Respects `prefers-reduced-motion`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AnimateIn>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 rounded-lg border bg-white text-gray-900 w-48 text-center">{children}</div>
);

export const Emerge: Story = {
  args: { preset: "emerge", children: <Box>Emerge</Box> },
};

export const Flow: Story = {
  args: { preset: "flow", children: <Box>Flow</Box> },
};

export const FadeUp: Story = {
  args: { preset: "fadeUp", children: <Box>Fade Up</Box> },
};

export const Scale: Story = {
  args: { preset: "scale", children: <Box>Scale</Box> },
};

export const WithDelay: Story = {
  args: { preset: "emerge", delay: 0.3, children: <Box>Delayed 300ms</Box> },
};

export const InView: Story = {
  name: "In-viewport trigger",
  render: () => (
    <div style={{ marginTop: 600 }}>
      <p className="text-sm text-gray-500 mb-4">Scroll down — animates on enter</p>
      <AnimateIn preset="emerge" inView>
        <Box>I animate when visible</Box>
      </AnimateIn>
    </div>
  ),
};

export const GroupStagger: Story = {
  name: "AnimateInGroup — staggered",
  render: () => (
    <AnimateInGroup stagger="normal" className="flex gap-4">
      {["One", "Two", "Three", "Four"].map((label) => (
        <AnimateIn key={label} preset="fadeUp">
          <Box>{label}</Box>
        </AnimateIn>
      ))}
    </AnimateInGroup>
  ),
};
