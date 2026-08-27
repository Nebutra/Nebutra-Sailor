import type { Meta, StoryObj } from "@storybook/react";
import { DottedWorldMap } from "./dotted-world-map";

const meta = {
  title: "Primitives/DottedWorldMap",
  component: DottedWorldMap,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative SVG world map with a diagonal dotted grid pattern. Useful for showing global presence or as a background element in landing pages.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    dotColor: { control: "color" },
    backgroundColor: { control: "color" },
    dotRadius: { control: { type: "range", min: 0.05, max: 0.5, step: 0.05 } },
  },
} satisfies Meta<typeof DottedWorldMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[600px]">
      <DottedWorldMap />
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className="w-[600px] rounded-xl bg-background p-4">
      <DottedWorldMap dotColor="#3f3f46" backgroundColor="transparent" />
    </div>
  ),
};

export const PrimaryColor: Story = {
  render: () => (
    <div className="w-[600px]">
      <DottedWorldMap
        dotColor="hsl(var(--primary))"
        backgroundColor="transparent"
        dotRadius={0.2}
      />
    </div>
  ),
};

export const LargeDots: Story = {
  render: () => (
    <div className="w-[600px]">
      <DottedWorldMap dotRadius={0.3} />
    </div>
  ),
};
