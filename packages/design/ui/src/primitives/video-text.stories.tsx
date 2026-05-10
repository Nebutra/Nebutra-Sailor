import type { Meta, StoryObj } from "@storybook/react";
import { VideoText } from "./video-text";

const meta = {
  title: "Primitives/VideoText",
  component: VideoText,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Renders a looping video visible only through the silhouette of text letters using an SVG mask. Eye-catching hero effect.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    fontSize: {
      control: { type: "range", min: 5, max: 30, step: 1 },
      description: "Font size in vw units",
    },
    fontWeight: {
      control: "select",
      options: [400, 700, 900, "bold", "black"],
      description: "Font weight",
    },
    fontFamily: {
      control: "text",
      description: "CSS font-family",
    },
  },
} satisfies Meta<typeof VideoText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
  name: "Layout Demo (no video)",
  render: () => (
    <div className="relative h-[300px] w-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600">
      <div
        className="absolute inset-0 flex items-center justify-center text-[20vw] font-black text-white/20"
        style={{ maskImage: "none" }}
      >
        {/* VideoText requires a real video src — this shows the container layout */}
        <span className="text-center text-4xl text-white">
          Add a video src to see VideoText in action
        </span>
      </div>
    </div>
  ),
};

export const UsageExample: Story = {
  name: "Usage Example (code reference)",
  render: () => (
    <div className="bg-muted p-6 rounded-lg font-mono text-sm">
      <pre>{`<div className="relative h-[300px] w-full overflow-hidden bg-black">
  <VideoText src="/videos/ocean.webm" fontSize={20} fontWeight={900}>
    OCEAN
  </VideoText>
</div>`}</pre>
    </div>
  ),
};
