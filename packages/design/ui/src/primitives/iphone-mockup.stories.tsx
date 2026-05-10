import type { Meta, StoryObj } from "@storybook/react";
import { IphoneMockup } from "./iphone-mockup";

const meta = {
  title: "Primitives/IphoneMockup",
  component: IphoneMockup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Realistic iPhone 15-style SVG frame mockup. Display images or videos inside the screen area. Responsive via CSS width control.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof IphoneMockup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-48">
      <IphoneMockup />
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <div className="w-48">
      <IphoneMockup src="https://picsum.photos/400/860" />
    </div>
  ),
};

export const Large: Story = {
  render: () => (
    <div className="w-72">
      <IphoneMockup src="https://picsum.photos/400/860" />
    </div>
  ),
};

export const SideBySide: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-2">Your mobile app</h2>
        <p className="text-muted-foreground text-sm">
          Beautiful on every device. Download now and experience the future.
        </p>
      </div>
      <div className="w-56">
        <IphoneMockup src="https://picsum.photos/400/860" />
      </div>
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className="dark bg-background p-12 rounded-xl">
      <div className="w-48">
        <IphoneMockup src="https://picsum.photos/400/860" />
      </div>
    </div>
  ),
};
