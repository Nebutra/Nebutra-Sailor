import type { Meta, StoryObj } from "@storybook/react";
import { useRef } from "react";
import { AnimatedBeam } from "./animated-beam";

const meta = {
  title: "Primitives/AnimatedBeam",
  component: AnimatedBeam,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Draws an animated glowing beam between two DOM elements. Perfect for integration diagrams, data-flow visualizations, and connection showcases.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AnimatedBeam>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    return (
      <div
        ref={containerRef}
        className="relative flex w-[400px] items-center justify-between rounded-xl border p-12"
      >
        <div
          ref={fromRef}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white font-bold"
        >
          A
        </div>
        <div
          ref={toRef}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-white font-bold"
        >
          B
        </div>
        <AnimatedBeam containerRef={containerRef} fromRef={fromRef} toRef={toRef} />
      </div>
    );
  },
};

export const Curved: Story = {
  render: () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    return (
      <div
        ref={containerRef}
        className="relative flex w-[400px] items-end justify-between rounded-xl border p-12 pt-24"
      >
        <div
          ref={fromRef}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-bold"
        >
          S
        </div>
        <div
          ref={toRef}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white text-sm font-bold"
        >
          E
        </div>
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          curvature={-60}
          gradientStartColor="#10b981"
          gradientStopColor="#ec4899"
        />
      </div>
    );
  },
};
