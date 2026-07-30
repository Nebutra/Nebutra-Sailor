import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { AnimateIn, AnimateInGroup, AnimateSwap } from "./animate-in";

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
  <div className="w-48 rounded-[var(--radius-lg)] border bg-card p-6 text-center text-card-foreground">
    {children}
  </div>
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
      <p className="mb-4 text-muted-foreground text-sm">Scroll down — animates on enter</p>
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

export const Swap: Story = {
  name: "AnimateSwap — one thing replacing another",
  parameters: {
    docs: {
      description: {
        story:
          "AnimateIn animates something arriving. AnimateSwap animates something being replaced: " +
          "changing `swapKey` plays the outgoing exit to completion before the incoming enters " +
          '(AnimatePresence mode="wait"), so the two never overlap and the layout never jumps. ' +
          "Use it for a value that changes in place — a step label, a status, a selected tab's body — " +
          "where mounting a second copy alongside the first would reflow the row.",
      },
    },
  },
  render: () => {
    const steps = ["Cloning", "Installing", "Building", "Deployed"];
    const [i, setI] = useState(0);
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 items-center">
          <AnimateSwap swapKey={steps[i] as string} preset="fadeUp">
            <Box>{steps[i]}</Box>
          </AnimateSwap>
        </div>
        <button
          type="button"
          onClick={() => setI((n) => (n + 1) % steps.length)}
          className="rounded-[var(--radius-md)] bg-primary px-3 py-1.5 text-primary-foreground text-sm"
        >
          Next step
        </button>
      </div>
    );
  },
};
