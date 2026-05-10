import type { Meta, StoryObj } from "@storybook/react";
import { LineShadowText } from "./line-shadow-text";

const meta = {
  title: "Primitives/LineShadowText",
  component: LineShadowText,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated diagonal line-shadow text effect powered by Framer Motion. A scrolling hatched shadow trails behind the text.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["span", "h1", "h2", "h3", "p"],
      description: "HTML element to render as",
    },
    shadowColor: {
      control: "color",
      description: "Shadow color",
    },
  },
} satisfies Meta<typeof LineShadowText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Magic UI",
    className: "text-5xl font-bold",
  },
};

export const BlueShadow: Story = {
  args: {
    children: "Blue Shadow",
    shadowColor: "#3b82f6",
    className: "text-5xl font-bold",
  },
};

export const AsHeading: Story = {
  args: {
    children: "Welcome",
    as: "h1",
    className: "text-6xl font-black",
  },
};

export const PurpleShadow: Story = {
  args: {
    children: "Purple Effect",
    shadowColor: "#a855f7",
    className: "text-5xl font-bold",
  },
};

export const WithMotionEntry: Story = {
  name: "With Framer Motion Entry",
  render: () => (
    <LineShadowText
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-5xl font-bold"
    >
      Animated Entry
    </LineShadowText>
  ),
};
