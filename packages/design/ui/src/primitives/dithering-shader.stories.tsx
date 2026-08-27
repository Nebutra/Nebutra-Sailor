import type { Meta, StoryObj } from "@storybook/react";
import { DitheringShader } from "./dithering-shader";

const meta = {
  title: "Primitives/DitheringShader",
  component: DitheringShader,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Standalone WebGL2 dithering shader canvas. A lower-level alternative to DitheringBackground — renders directly to a canvas element without theme awareness or overlay effects.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    colorBack: { control: "color" },
    colorFront: { control: "color" },
    shape: {
      control: "select",
      options: ["noise", "warp", "stripe", "circle"],
    },
    type: { control: "select", options: ["2x2", "4x4", "8x8"] },
    pxSize: { control: { type: "range", min: 1, max: 8, step: 1 } },
    speed: { control: { type: "range", min: 0, max: 2, step: 0.1 } },
  },
} satisfies Meta<typeof DitheringShader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DitheringShader width={400} height={250} />,
};

export const DarkScheme: Story = {
  render: () => (
    <DitheringShader width={400} height={250} colorBack="#000000" colorFront="#614B00" />
  ),
};

export const BlueTheme: Story = {
  render: () => (
    <DitheringShader width={400} height={250} colorBack="#F7FAFF" colorFront="#3956A3" />
  ),
};

export const WarpShape: Story = {
  render: () => (
    <DitheringShader
      width={400}
      height={250}
      shape="warp"
      colorBack="#0a0a0a"
      colorFront="#00e5ff"
    />
  ),
};

export const LargePixels: Story = {
  render: () => (
    <DitheringShader width={400} height={250} pxSize={6} colorBack="#1a1a2e" colorFront="#e94560" />
  ),
};

export const Paused: Story = {
  render: () => (
    <DitheringShader width={400} height={250} speed={0} colorBack="#0f3460" colorFront="#7FA4FF" />
  ),
};
