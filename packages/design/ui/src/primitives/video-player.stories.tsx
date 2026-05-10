import type { Meta, StoryObj } from "@storybook/react";
import { VideoPlayer } from "./video-player";

const meta = {
  title: "Primitives/VideoPlayer",
  component: VideoPlayer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Custom video player with animated controls overlay. Features play/pause, animated progress bar, volume slider, playback speed buttons, and auto-hiding controls on mouse leave.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    src: { control: "text" },
    poster: { control: "text" },
    autoPlay: { control: "boolean" },
    loop: { control: "boolean" },
    initialVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
} satisfies Meta<typeof VideoPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Using a public domain sample video for demonstration
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_POSTER =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg";

export const Default: Story = {
  render: () => (
    <div className="w-[640px]">
      <VideoPlayer src={SAMPLE_VIDEO} poster={SAMPLE_POSTER} />
    </div>
  ),
};

export const WithControlsVisible: Story = {
  render: () => (
    <div className="w-[640px]">
      <VideoPlayer src={SAMPLE_VIDEO} poster={SAMPLE_POSTER} showControlsOnMount />
    </div>
  ),
};

export const CustomSpeeds: Story = {
  render: () => (
    <div className="w-[640px]">
      <VideoPlayer
        src={SAMPLE_VIDEO}
        poster={SAMPLE_POSTER}
        speeds={[0.5, 0.75, 1, 1.25, 1.5, 2]}
        showControlsOnMount
      />
    </div>
  ),
};

export const Autoplay: Story = {
  render: () => (
    <div className="w-[640px]">
      <VideoPlayer src={SAMPLE_VIDEO} autoPlay loop />
    </div>
  ),
};

export const LowInitialVolume: Story = {
  render: () => (
    <div className="w-[640px]">
      <VideoPlayer
        src={SAMPLE_VIDEO}
        poster={SAMPLE_POSTER}
        initialVolume={0.3}
        showControlsOnMount
      />
    </div>
  ),
};
