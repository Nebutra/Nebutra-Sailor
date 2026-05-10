import type { Meta, StoryObj } from "@storybook/react";
import { WarpBackground } from "./warp-background";

const meta = {
  title: "Primitives/WarpBackground",
  component: WarpBackground,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Container with a 3D perspective grid and animated color beams traveling along grid lines from all four sides. Sci-fi futuristic aesthetic.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    perspective: { control: { type: "range", min: 50, max: 300, step: 10 } },
    beamsPerSide: { control: { type: "range", min: 1, max: 8, step: 1 } },
    beamSize: { control: { type: "range", min: 2, max: 15, step: 1 } },
    beamDuration: { control: { type: "range", min: 1, max: 8, step: 1 } },
    gridColor: { control: "color" },
  },
} satisfies Meta<typeof WarpBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to the Future</h2>
        <p className="mt-2 text-muted-foreground">Experience the next generation.</p>
      </div>
    ),
  },
};

export const BlueGrid: Story = {
  args: {
    perspective: 150,
    beamsPerSide: 5,
    beamDuration: 4,
    gridColor: "rgba(59, 130, 246, 0.3)",
    children: (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Blue Warp</h2>
        <p className="text-sm text-muted-foreground">Custom grid color</p>
      </div>
    ),
  },
};

export const Dramatic: Story = {
  args: {
    perspective: 50,
    beamSize: 8,
    beamsPerSide: 4,
    children: (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Dramatic</h2>
        <p className="text-sm text-muted-foreground">Close perspective</p>
      </div>
    ),
  },
};
