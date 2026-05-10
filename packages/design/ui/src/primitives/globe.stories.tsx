import type { Meta, StoryObj } from "@storybook/react";
import { Globe } from "./globe";

const meta = {
  title: "Primitives/Globe",
  component: Globe,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Interactive 3D WebGL globe powered by COBE. Supports auto-rotation, drag interaction, and custom markers. Requires a positioned container.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Globe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[300px] w-[300px]">
      <Globe />
    </div>
  ),
};

export const CustomMarkers: Story = {
  render: () => (
    <div className="relative h-[300px] w-[300px]">
      <Globe
        config={{
          markers: [
            { location: [40.7128, -74.006], size: 0.1 },
            { location: [51.5074, -0.1278], size: 0.08 },
            { location: [35.6762, 139.6503], size: 0.08 },
            { location: [48.8566, 2.3522], size: 0.07 },
          ],
          markerColor: [0.1, 0.8, 1],
          baseColor: [0.3, 0.3, 0.3],
          glowColor: [0.2, 0.4, 1],
          dark: 1,
        }}
      />
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="relative h-[300px] w-[300px]">
      <Globe
        config={{
          dark: 1,
          baseColor: [0.1, 0.1, 0.3],
          glowColor: [0.3, 0.5, 1],
          markerColor: [1, 0.8, 0.2],
        }}
      />
    </div>
  ),
};

export const SlowRotation: Story = {
  render: () => (
    <div className="relative h-[300px] w-[300px]">
      <Globe rotationSpeed={0.001} />
    </div>
  ),
};

export const NoRotation: Story = {
  render: () => (
    <div className="relative h-[300px] w-[300px]">
      <Globe rotationSpeed={0} />
    </div>
  ),
};
