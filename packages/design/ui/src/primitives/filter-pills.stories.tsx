"use client";

import {
  Briefcase,
  Code as Code2,
  Heart,
  Pencil,
  Lightning as Rocket,
  Sparkles,
  Star,
  Lightning as Zap,
} from "@nebutra/icons";
import { GraduationCap, Wallet } from "@phosphor-icons/react/dist/ssr";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { type FilterPillOption, FilterPills, type FilterPillsProps } from "./filter-pills";

const meta: Meta<typeof FilterPills> = {
  title: "Primitives/FilterPills",
  component: FilterPills,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};
export default meta;

type Story = StoryObj<typeof FilterPills>;

// ─── Shared option sets ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS: FilterPillOption[] = [
  { value: "all", label: "全部" },
  { value: "featured", label: "官方精选" },
  { value: "dev", label: "技术开发" },
  { value: "writing", label: "创意写作" },
  { value: "office", label: "办公效率" },
  { value: "finance", label: "商业金融" },
  { value: "education", label: "教育学习" },
];

const CATEGORY_OPTIONS_WITH_COUNTS: FilterPillOption[] = [
  { value: "all", label: "全部", count: 248 },
  { value: "featured", label: "官方精选", count: 32 },
  { value: "dev", label: "技术开发", count: 84 },
  { value: "writing", label: "创意写作", count: 47 },
  { value: "office", label: "办公效率", count: 56 },
  { value: "finance", label: "商业金融", count: 19 },
  { value: "education", label: "教育学习", count: 28 },
];

const OVERFLOW_OPTIONS: FilterPillOption[] = [
  { value: "all", label: "全部" },
  { value: "featured", label: "官方精选" },
  { value: "dev", label: "技术开发" },
  { value: "writing", label: "创意写作" },
  { value: "office", label: "办公效率" },
  { value: "finance", label: "商业金融" },
  { value: "education", label: "教育学习" },
  { value: "lifestyle", label: "生活百科" },
  { value: "entertainment", label: "娱乐休闲" },
  { value: "travel", label: "旅游出行" },
  { value: "health", label: "健康医疗" },
  { value: "food", label: "美食烹饪" },
  { value: "sports", label: "运动健身" },
  { value: "music", label: "音乐艺术" },
  { value: "language", label: "语言翻译" },
  { value: "research", label: "学术研究" },
];

const ICON_OPTIONS: FilterPillOption[] = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "featured", label: "Featured", icon: Star },
  { value: "dev", label: "Developer", icon: Code2 },
  { value: "writing", label: "Writing", icon: Pencil },
  { value: "office", label: "Productivity", icon: Zap },
  { value: "finance", label: "Finance", icon: Wallet },
  { value: "education", label: "Education", icon: GraduationCap },
  { value: "lifestyle", label: "Lifestyle", icon: Heart },
  { value: "business", label: "Business", icon: Briefcase },
  { value: "startup", label: "Startup", icon: Rocket },
];

// ─── Interactive wrappers ─────────────────────────────────────────────────────

function SingleDemo(
  props: Omit<
    Extract<FilterPillsProps, { type?: "single" }>,
    "value" | "onValueChange" | "type"
  > & { initial?: string },
) {
  const { initial = "all", ...rest } = props;
  const [value, setValue] = React.useState<string>(initial);
  return <FilterPills {...rest} value={value} onValueChange={setValue} />;
}

function MultipleDemo(
  props: Omit<
    Extract<FilterPillsProps, { type: "multiple" }>,
    "value" | "onValueChange" | "type"
  > & { initial?: string[] },
) {
  const { initial = [], ...rest } = props;
  const [value, setValue] = React.useState<string[]>(initial);
  return <FilterPills {...rest} type="multiple" value={value} onValueChange={setValue} />;
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <SingleDemo options={CATEGORY_OPTIONS} initial="all" />,
};

export const WithCounts: Story = {
  render: () => <SingleDemo options={CATEGORY_OPTIONS_WITH_COUNTS} initial="all" />,
};

export const MultiSelect: Story = {
  render: () => <MultipleDemo options={CATEGORY_OPTIONS} initial={["featured", "dev"]} />,
};

export const Subtle: Story = {
  render: () => <SingleDemo options={CATEGORY_OPTIONS} initial="featured" variant="subtle" />,
};

export const Small: Story = {
  render: () => <SingleDemo options={CATEGORY_OPTIONS} initial="all" size="sm" />,
};

export const Overflow: Story = {
  render: () => (
    <div className="max-w-[640px] border border-dashed border-border p-4 rounded-lg">
      <SingleDemo options={OVERFLOW_OPTIONS} initial="all" />
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => <SingleDemo options={ICON_OPTIONS} initial="all" />,
};
