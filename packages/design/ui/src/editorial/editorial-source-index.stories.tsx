import type { Meta, StoryObj } from "@storybook/react";
import { EditorialSourceIndex } from "./editorial-source-index";

const meta: Meta<typeof EditorialSourceIndex> = {
  title: "Editorial/SourceIndex",
  component: EditorialSourceIndex,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Numbered reference list closing a researched piece. Ordered, because the body cites entries by number.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialSourceIndex>;

export const Default: Story = {
  args: {
    summary: "4 sources behind this Frontier note.",
    sources: [
      {
        title: "Big Ideas in Tech for 2025",
        publisher: "a16z",
        author: "Marc Andrusko",
        url: "https://a16z.com/big-ideas-in-tech-2025/",
      },
      {
        title: "Trading Margin for Moat",
        publisher: "a16z",
        url: "https://a16z.com/trading-margin-for-moat/",
        summary: "Argues that forward-deployed implementation work is the defensible layer.",
      },
      {
        title: "Vibe Code Game Jam results",
        publisher: "X",
        author: "Pieter Levels",
        url: "https://x.com/levelsio",
      },
      {
        title: "Cursor reaches $2B run rate",
        publisher: "TechCrunch",
        url: "https://techcrunch.com/",
        accessedAt: "2026-02-14",
      },
    ],
  },
};

export const Localized: Story = {
  args: {
    label: "资料索引",
    summary: "2 个来源支撑这篇 Frontier 笔记。",
    sources: [
      { title: "中关村论坛演讲实录", publisher: "新经济观察", url: "https://example.com/a" },
      {
        title: "2025 年中反思",
        publisher: "真格基金",
        author: "戴雨森",
        url: "https://example.com/b",
      },
    ],
  },
};
