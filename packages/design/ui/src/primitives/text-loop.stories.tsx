import type { Meta, StoryObj } from "@storybook/react";
import { TextLoop } from "./text-loop";

const meta = {
  title: "Primitives/TextLoop",
  component: TextLoop,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Cycles through an array of text/content items with smooth Framer Motion slide animations. Ideal for rotating taglines, testimonials, or hero subtitles.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    interval: {
      control: { type: "range", min: 0.5, max: 5, step: 0.5 },
      description: "Seconds between transitions",
    },
  },
} satisfies Meta<typeof TextLoop>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TextLoop className="text-3xl font-bold">
      {["Designers", "Developers", "Founders"].map((t) => (
        <span key={t}>{t}</span>
      ))}
    </TextLoop>
  ),
};

export const InlineWithStatic: Story = {
  name: "Inline With Static Text",
  render: () => (
    <p className="text-2xl">
      Built for{" "}
      <TextLoop interval={1.5} className="font-bold text-primary">
        {["speed", "scale", "simplicity"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </TextLoop>
    </p>
  ),
};

export const SlowTransition: Story = {
  render: () => (
    <TextLoop
      interval={3}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="text-4xl font-bold"
    >
      {["Hello", "Bonjour", "Hola", "Ciao"].map((t) => (
        <span key={t}>{t}</span>
      ))}
    </TextLoop>
  ),
};

export const MultiLine: Story = {
  name: "Multi-line Items",
  render: () => (
    <TextLoop interval={2.5} className="text-center">
      {[
        <div key="1" className="text-2xl font-bold">
          First Item
        </div>,
        <div key="2" className="text-2xl font-bold text-blue-500">
          Second Item
        </div>,
        <div key="3" className="text-2xl font-bold text-purple-500">
          Third Item
        </div>,
      ]}
    </TextLoop>
  ),
};
