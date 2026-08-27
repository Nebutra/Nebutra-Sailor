import type { Meta, StoryObj } from "@storybook/react";
import { EditorialChart } from "./editorial-chart";

const meta: Meta<typeof EditorialChart> = {
  title: "Editorial/Chart",
  component: EditorialChart,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Inline data figure. Bars are CSS so labels stay selectable and reflow; the trend line is SVG because the shape between points carries the meaning. Both emit a visually hidden data table.",
      },
    },
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["bar", "line"] },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialChart>;

export const Bars: Story = {
  args: {
    variant: "bar",
    label: "Distribution",
    title: "Where new AI companies cluster",
    points: [
      { label: "Customer service", value: 34, display: "34%" },
      { label: "Image generation", value: 27, display: "27%" },
      { label: "Voice assistants", value: 19, display: "19%" },
      { label: "Everything else", value: 20, display: "20%" },
    ],
    caption: "Share of surveyed 2026 cohort by primary category.",
  },
};

export const Trend: Story = {
  args: {
    variant: "line",
    label: "Run rate",
    title: "Annualized revenue",
    points: [
      { label: "2023", value: 8, display: "$8M" },
      { label: "2024", value: 100, display: "$100M" },
      { label: "2025", value: 500, display: "$500M" },
      { label: "2026", value: 2000, display: "$2B" },
    ],
  },
};

export const SinglePoint: Story = {
  name: "Single point",
  args: {
    variant: "bar",
    points: [{ label: "Adoption", value: 70, display: "70%" }],
  },
};
