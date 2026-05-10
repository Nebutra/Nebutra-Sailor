import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedGroup } from "./animated-group";

const meta = {
  title: "Primitives/AnimatedGroup",
  component: AnimatedGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Staggered animation container. Each child is wrapped in a motion.div with staggered reveal. Supports 10 preset animations or custom Framer Motion variants.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    preset: {
      control: "select",
      options: [
        "fade",
        "slide",
        "scale",
        "blur",
        "blur-slide",
        "zoom",
        "flip",
        "bounce",
        "rotate",
        "swing",
      ],
    },
  },
} satisfies Meta<typeof AnimatedGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const Items = () => (
  <>
    {["Item 1", "Item 2", "Item 3", "Item 4"].map((label) => (
      <div key={label} className="rounded-lg border bg-card p-4 text-sm font-medium">
        {label}
      </div>
    ))}
  </>
);

export const BlurSlide: Story = {
  render: () => (
    <AnimatedGroup preset="blur-slide" className="flex flex-col gap-3 w-48">
      <Items />
    </AnimatedGroup>
  ),
};

export const Slide: Story = {
  render: () => (
    <AnimatedGroup preset="slide" className="flex flex-col gap-3 w-48">
      <Items />
    </AnimatedGroup>
  ),
};

export const Bounce: Story = {
  render: () => (
    <AnimatedGroup preset="bounce" className="flex flex-col gap-3 w-48">
      <Items />
    </AnimatedGroup>
  ),
};

export const Zoom: Story = {
  render: () => (
    <AnimatedGroup preset="zoom" className="flex flex-col gap-3 w-48">
      <Items />
    </AnimatedGroup>
  ),
};

export const Flip: Story = {
  render: () => (
    <AnimatedGroup preset="flip" className="flex flex-col gap-3 w-48">
      <Items />
    </AnimatedGroup>
  ),
};

export const HeroSection: Story = {
  render: () => (
    <AnimatedGroup
      preset="blur-slide"
      className="flex flex-col items-center gap-6 text-center max-w-md"
    >
      <div className="rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
        New — Version 2.0 released
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Build faster</h1>
      <p className="text-muted-foreground">
        The platform for modern teams to move fast without breaking things.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Get started
        </button>
        <button type="button" className="rounded-lg border px-5 py-2 text-sm font-medium">
          Learn more
        </button>
      </div>
    </AnimatedGroup>
  ),
};

export const GridLayout: Story = {
  render: () => (
    <AnimatedGroup preset="slide" className="grid grid-cols-3 gap-4 w-96">
      {["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"].map((name) => (
        <div key={name} className="rounded-lg border p-4 text-center text-sm">
          {name}
        </div>
      ))}
    </AnimatedGroup>
  ),
};
