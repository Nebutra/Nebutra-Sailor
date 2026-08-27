import type { Meta, StoryObj } from "@storybook/react";
import { EditorialComparisonTable } from "./editorial-comparison-table";

const meta: Meta<typeof EditorialComparisonTable> = {
  title: "Editorial/ComparisonTable",
  component: EditorialComparisonTable,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Matrix comparing options across dimensions. Below `md` it restacks into one block per row, each cell carrying its own column label — resize the preview to see it.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialComparisonTable>;

export const Default: Story = {
  args: {
    title: "Publishing paths",
    columns: ["Markdown", "PortableText JSON"],
    rows: [
      { label: "Prose, quotes, links", cells: ["Full support", "Full support"] },
      { label: "Callouts, stat grids", cells: ["Not representable", "Full support"] },
      { label: "Author ergonomics", cells: ["Highest", "Structured, verbose"] },
      { label: "Round-trips from CMS", cells: ["Lossy", "Lossless"] },
    ],
  },
};

export const Localized: Story = {
  name: "Localized dimension header",
  args: {
    dimensionLabel: "维度",
    title: "两种发布路径",
    columns: ["Markdown", "PortableText JSON"],
    rows: [
      { label: "正文与引用", cells: ["完整支持", "完整支持"] },
      { label: "结构化块", cells: ["无法表达", "完整支持"] },
      { label: "写作体感", cells: ["最好", "结构化但冗长"] },
    ],
  },
};

export const ThreeColumns: Story = {
  name: "Three columns",
  args: {
    columns: ["QStash", "BullMQ", "Memory"],
    rows: [
      { label: "Runtime", cells: ["Serverless", "Self-hosted Redis", "In-process"] },
      { label: "Durability", cells: ["Managed", "Redis-backed", "None"] },
      { label: "Use", cells: ["Production edge", "Production origin", "Dev and test"] },
    ],
  },
};
