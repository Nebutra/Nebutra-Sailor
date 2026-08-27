import type { Meta, StoryObj } from "@storybook/react";
import { FlickeringGrid } from "./flickering-grid";

const meta = {
  title: "Primitives/FlickeringGrid",
  component: FlickeringGrid,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Canvas-based animated grid where squares randomly flicker between opacity levels. A subtle, tech-aesthetic ambient background.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    color: { control: "color" },
    squareSize: { control: { type: "range", min: 1, max: 12, step: 1 } },
    gridGap: { control: { type: "range", min: 1, max: 16, step: 1 } },
    flickerChance: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    maxOpacity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof FlickeringGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <FlickeringGrid className="absolute inset-0" />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold">Flickering Grid</h2>
      </div>
    </div>
  ),
};

export const BlueGrid: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden bg-background">
      <FlickeringGrid
        className="absolute inset-0"
        color="rgb(59, 130, 246)"
        maxOpacity={0.4}
        flickerChance={0.5}
      />
      <div className="relative z-10 flex h-full items-center justify-center">
        <h2 className="text-3xl font-bold text-white">Blue Grid</h2>
      </div>
    </div>
  ),
};

export const DenseSmall: Story = {
  render: () => (
    <div className="relative h-[300px] w-full overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0"
        squareSize={2}
        gridGap={3}
        color="rgb(34, 197, 94)"
        maxOpacity={0.3}
      />
    </div>
  ),
};
