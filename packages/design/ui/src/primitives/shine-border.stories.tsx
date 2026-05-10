import type { Meta, StoryObj } from "@storybook/react";
import { ShineBorder } from "./shine-border";

const meta = {
  title: "Primitives/ShineBorder",
  component: ShineBorder,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated rotating gradient border. Overlay mode (no children) wraps existing elements; container mode (with children) is a standalone card.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    borderWidth: { control: { type: "range", min: 1, max: 4, step: 1 } },
    duration: { control: { type: "range", min: 4, max: 30, step: 1 } },
    borderRadius: { control: { type: "range", min: 4, max: 32, step: 4 } },
  },
} satisfies Meta<typeof ShineBorder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlayMode: Story = {
  name: "Overlay Mode",
  render: () => (
    <div className="relative rounded-xl border p-8">
      <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />
      <p className="text-center font-medium">Overlay mode — wraps existing element</p>
    </div>
  ),
};

export const ContainerMode: Story = {
  name: "Container Mode",
  render: () => (
    <ShineBorder shineColor="#A07CFE" borderRadius={16} borderWidth={2}>
      <div className="text-center">
        <h2 className="font-bold">Shine Card</h2>
        <p className="text-sm text-muted-foreground">Container mode</p>
      </div>
    </ShineBorder>
  ),
};

export const RainbowGradient: Story = {
  render: () => (
    <div className="relative rounded-2xl border p-10">
      <ShineBorder shineColor={["#FF6B6B", "#FFE66D", "#4ECDC4"]} />
      <p className="text-center font-bold">Rainbow Border</p>
    </div>
  ),
};

export const FastAnimation: Story = {
  render: () => (
    <ShineBorder shineColor="#6366f1" duration={5} borderWidth={2} borderRadius={12}>
      <p className="font-medium">Fast Animation</p>
    </ShineBorder>
  ),
};
