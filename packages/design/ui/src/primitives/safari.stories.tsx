import type { Meta, StoryObj } from "@storybook/react";
import { Safari } from "./safari";

const meta = {
  title: "Primitives/Safari",
  component: Safari,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Safari browser window SVG mockup for showcasing websites. Two modes: default (with toolbar icons) and simple (clean address bar only).",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    mode: { control: "radio", options: ["default", "simple"] },
    url: { control: "text" },
  },
} satisfies Meta<typeof Safari>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[700px]">
      <Safari url="https://nebutra.com" />
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <div className="w-[700px]">
      <Safari url="https://nebutra.com" imageSrc="https://picsum.photos/1200/700" />
    </div>
  ),
};

export const SimpleMode: Story = {
  render: () => (
    <div className="w-[700px]">
      <Safari url="https://nebutra.com" imageSrc="https://picsum.photos/1200/700" mode="simple" />
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className="dark bg-background p-8 rounded-xl">
      <div className="w-[700px]">
        <Safari url="https://app.nebutra.com" imageSrc="https://picsum.photos/1200/700" />
      </div>
    </div>
  ),
};
