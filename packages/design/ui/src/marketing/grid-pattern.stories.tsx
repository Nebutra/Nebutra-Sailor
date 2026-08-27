import type { Meta, StoryObj } from "@storybook/react";
import { GridPattern } from "./grid-pattern";

const meta: Meta<typeof GridPattern> = {
  title: "Marketing/GridPattern",
  component: GridPattern,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Decorative background grid. It is meant to be masked — an unmasked grid reads as a wireframe, not as texture, so every story here shows it behind real content with a fade.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof GridPattern>;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-neutral-1 p-16">
    {children}
    <div className="relative z-10 max-w-xl text-center">
      <h2 className="font-semibold text-3xl text-neutral-12 tracking-tight">
        Texture, not wireframe
      </h2>
      <p className="mt-3 text-neutral-11">
        The grid should fall away before it reaches the copy. If you can count the cells behind a
        headline, the mask is wrong.
      </p>
    </div>
  </div>
);

/** Faded toward the content — the intended treatment. */
export const Masked: Story = {
  render: () => (
    <Stage>
      <GridPattern className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] opacity-60" />
    </Stage>
  ),
};

/** Fading downward, as used under a hero. */
export const FadeToBottom: Story = {
  render: () => (
    <Stage>
      <GridPattern className="[mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-50" />
    </Stage>
  ),
};

/** Unmasked, for reference — this is what to avoid shipping. */
export const Unmasked: Story = {
  render: () => (
    <Stage>
      <GridPattern />
    </Stage>
  ),
};
