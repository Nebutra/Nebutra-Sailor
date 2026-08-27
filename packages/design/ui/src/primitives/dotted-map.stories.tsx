import type { Meta, StoryObj } from "@storybook/react";
import { DottedMap } from "./dotted-map";

const meta = {
  title: "Primitives/DottedMap",
  component: DottedMap,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "SVG world map rendered with dots using the svg-dotted-map library. Supports custom markers for highlighting locations, dot size, and stagger offset.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    dotRadius: { control: { type: "range", min: 0.1, max: 0.5, step: 0.05 } },
    markerColor: { control: "color" },
  },
} satisfies Meta<typeof DottedMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[300px] w-[600px]">
      <DottedMap />
    </div>
  ),
};

export const WithMarkers: Story = {
  render: () => (
    <div className="h-[300px] w-[600px]">
      <DottedMap
        markers={[
          { lat: 40.7128, lng: -74.006 },
          { lat: 51.5074, lng: -0.1278 },
          { lat: 35.6762, lng: 139.6503 },
          { lat: 48.8566, lng: 2.3522 },
          { lat: -33.8688, lng: 151.2093 },
          { lat: 37.7749, lng: -122.4194 },
        ]}
        markerColor="#FF6900"
      />
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="h-[300px] w-[600px] bg-background rounded-xl p-4">
      <DottedMap
        markers={[
          { lat: 40.7128, lng: -74.006, size: 0.4 },
          { lat: 51.5074, lng: -0.1278, size: 0.3 },
          { lat: 35.6762, lng: 139.6503, size: 0.3 },
        ]}
        markerColor="#00e5ff"
        className="text-muted-foreground"
      />
    </div>
  ),
};

export const FineDots: Story = {
  render: () => (
    <div className="h-[300px] w-[600px]">
      <DottedMap dotRadius={0.12} mapSamples={8000} />
    </div>
  ),
};

export const NoStagger: Story = {
  render: () => (
    <div className="h-[300px] w-[600px]">
      <DottedMap stagger={false} />
    </div>
  ),
};
