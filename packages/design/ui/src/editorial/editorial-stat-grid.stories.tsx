import type { Meta, StoryObj } from "@storybook/react";
import { EditorialStatGrid } from "./editorial-stat-grid";

const meta: Meta<typeof EditorialStatGrid> = {
  title: "Editorial/StatGrid",
  component: EditorialStatGrid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Row of headline figures separated by shared hairlines. Boxing each number would make the set read as unrelated facts.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialStatGrid>;

export const Default: Story = {
  args: {
    label: "By the numbers",
    items: [
      { value: "92%", label: "Interface similarity", caption: "Across surveyed chatbot products" },
      { value: "1,170", label: "Games shipped", caption: "In a seven-day AI game jam" },
      { value: "<20%", label: "Datacenter utilization", caption: "National average" },
    ],
  },
};

export const TwoUp: Story = {
  name: "Two figures",
  args: {
    items: [
      { value: "$2B", label: "Annualized revenue run rate" },
      { value: "1M+", label: "Paid users" },
    ],
  },
};

export const FourUp: Story = {
  name: "Four figures",
  args: {
    title: "Cursor, three years in",
    items: [
      { value: "$8M", label: "Seed round" },
      { value: "$2B", label: "ARR run rate" },
      { value: "70%", label: "Of the Fortune 1000" },
      { value: "$50B", label: "Reported valuation" },
    ],
  },
};
