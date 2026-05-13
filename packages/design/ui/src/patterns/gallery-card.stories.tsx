"use client";

import {
  BarChart as BarChart3,
  Code as Code2,
  FileText,
  Image as ImageIcon,
  Music,
  Sparkles,
  Video,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { GalleryCard, type GalleryCardIconTone } from "./gallery-card";

const meta: Meta<typeof GalleryCard> = {
  title: "Patterns/GalleryCard",
  component: GalleryCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Discovery card pattern modelled on MiniMax / OpenAI GPT Store / Vercel templates. Renders an icon tile, title, description, metadata strip (author + metric), action menu, and pinned/featured indicators. Works as a link, button, or static card.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof GalleryCard>;

const noop = () => {};

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    icon: <FileText className="h-5 w-5" />,
    iconTone: "blue",
    title: "PPTX 制作",
    description: "上传文档或输入主题，自动生成结构清晰、视觉精美的演示文稿，支持多种风格模板。",
    metadata: {
      author: "By MiniMax",
      metric: "710478 浏览量",
    },
    onClick: noop,
  },
  render: (args) => (
    <div className="w-[320px]">
      <GalleryCard {...args} />
    </div>
  ),
};

// ─── Featured (inline badge) ──────────────────────────────────────────────────

export const Featured: Story = {
  args: {
    icon: <Sparkles className="h-5 w-5" />,
    iconTone: "purple",
    title: "Deep Research",
    description:
      "Multi-step research agent that browses, reads, and synthesises sources into a cited report.",
    badge: { label: "Featured", tone: "featured" },
    metadata: {
      author: "By OpenAI",
      metric: "1.2M uses",
    },
    onClick: noop,
  },
  render: (args) => (
    <div className="w-[320px]">
      <GalleryCard {...args} />
    </div>
  ),
};

// ─── Pinned (star indicator top-right) ────────────────────────────────────────

export const Pinned: Story = {
  args: {
    icon: <Code2 className="h-5 w-5" />,
    iconTone: "cyan",
    title: "Code Reviewer",
    description:
      "Reviews diffs for security, performance, and style issues against your house rules.",
    pinned: true,
    metadata: {
      author: "By Nebutra",
      metric: "Pinned to workspace",
    },
    onClick: noop,
  },
  render: (args) => (
    <div className="w-[320px]">
      <GalleryCard {...args} />
    </div>
  ),
};

// ─── WithActions (kebab menu with 3 items incl. destructive) ──────────────────

export const WithActions: Story = {
  args: {
    icon: <Video className="h-5 w-5" />,
    iconTone: "pink",
    title: "Video Summariser",
    description:
      "Paste a YouTube or Vimeo URL and receive a chaptered summary with key timestamps.",
    metadata: {
      author: "By Community",
      metric: "84.5k uses",
    },
    actions: [
      { id: "duplicate", label: "Duplicate", onSelect: noop },
      { id: "share", label: "Share link…", onSelect: noop },
      { id: "delete", label: "Delete", onSelect: noop, destructive: true },
    ],
    onClick: noop,
  },
  render: (args) => (
    <div className="w-[320px]">
      <GalleryCard {...args} />
    </div>
  ),
};

// ─── Grid (4 cards) ───────────────────────────────────────────────────────────

export const Grid: Story = {
  render: () => (
    <div className="grid w-full max-w-[1400px] grid-cols-2 gap-4 lg:grid-cols-4">
      <GalleryCard
        icon={<FileText className="h-5 w-5" />}
        iconTone="blue"
        title="PPTX 制作"
        description="上传文档或输入主题，自动生成结构清晰、视觉精美的演示文稿。"
        metadata={{ author: "By MiniMax", metric: "710478 浏览量" }}
        onClick={noop}
      />
      <GalleryCard
        icon={<Sparkles className="h-5 w-5" />}
        iconTone="purple"
        title="Deep Research"
        description="Multi-step research agent that browses, reads, and cites sources."
        badge={{ label: "Featured", tone: "featured" }}
        metadata={{ author: "By OpenAI", metric: "1.2M uses" }}
        onClick={noop}
      />
      <GalleryCard
        icon={<Code2 className="h-5 w-5" />}
        iconTone="cyan"
        title="Code Reviewer"
        description="Reviews diffs for security, performance, and style issues."
        pinned
        metadata={{ author: "By Nebutra", metric: "92.1k uses" }}
        actions={[
          { id: "edit", label: "Edit", onSelect: noop },
          { id: "delete", label: "Delete", onSelect: noop, destructive: true },
        ]}
        onClick={noop}
      />
      <GalleryCard
        icon={<BarChart3 className="h-5 w-5" />}
        iconTone="green"
        title="Spreadsheet Analyst"
        description="Drop in a CSV and ask questions in plain language. Returns charts and summaries."
        badge={{ label: "Beta", tone: "beta" }}
        metadata={{ author: "By Community", metric: "18.4k uses" }}
        onClick={noop}
      />
    </div>
  ),
};

// ─── AllTones (one card per iconTone) ─────────────────────────────────────────

const toneShowcase: Array<{
  tone: GalleryCardIconTone;
  title: string;
  icon: React.ReactNode;
}> = [
  { tone: "neutral", title: "Neutral", icon: <FileText className="h-5 w-5" /> },
  { tone: "blue", title: "Blue", icon: <FileText className="h-5 w-5" /> },
  { tone: "cyan", title: "Cyan", icon: <Code2 className="h-5 w-5" /> },
  { tone: "purple", title: "Purple", icon: <Sparkles className="h-5 w-5" /> },
  { tone: "amber", title: "Amber", icon: <Music className="h-5 w-5" /> },
  { tone: "green", title: "Green", icon: <BarChart3 className="h-5 w-5" /> },
  { tone: "pink", title: "Pink", icon: <ImageIcon className="h-5 w-5" /> },
];

export const AllTones: Story = {
  render: () => (
    <div className="grid w-full max-w-[1400px] grid-cols-2 gap-4 lg:grid-cols-4">
      {toneShowcase.map((t) => (
        <GalleryCard
          key={t.tone}
          icon={t.icon}
          iconTone={t.tone}
          title={t.title}
          description={`Demo card using the "${t.tone}" icon tone. Hover to see the lift + border treatment.`}
          metadata={{ author: "By Nebutra", metric: "demo" }}
          onClick={noop}
        />
      ))}
    </div>
  ),
};
