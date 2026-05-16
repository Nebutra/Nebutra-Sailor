import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { MessageContent, normalizeMessageMarkdown } from "./message-content";

const sampleMarkdown = [
  "## Deployment Summary",
  "",
  "The rollout completed with **zero failed regions** and `p95 < 180ms`.",
  "",
  "1.",
  "",
  "Prepare migration window",
  "2.",
  "",
  "Promote edge config",
  "",
  "| Region | Status |",
  "| --- | --- |",
  "| iad1 | Ready |",
  "| sfo1 | Ready |",
  "",
  "```nonsense private renderer hint",
  "const unsafe = true;",
  "```",
].join("\n");

const meta = {
  title: "Primitives/MessageContent",
  component: MessageContent,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Streaming-aware markdown renderer for AI responses. Normalizes common LLM markdown defects before rendering through the platform message pipeline.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[min(42rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-border bg-background p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: sampleMarkdown,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByRole("heading", { name: "Deployment Summary" })).toBeInTheDocument();
    expect(canvas.getByText("Prepare migration window")).toBeInTheDocument();
    expect(canvas.getByText("iad1")).toBeInTheDocument();
  },
};

export const Compact: Story = {
  args: {
    density: "compact",
    children: sampleMarkdown,
  },
};

export const Inverted: Story = {
  render: () => (
    <div className="rounded-[var(--radius-lg)] bg-primary p-4 text-primary-foreground">
      <MessageContent inverted>{sampleMarkdown}</MessageContent>
    </div>
  ),
};

export const LongText: Story = {
  args: {
    children: [
      "A very long unbroken token should stay inside the message surface instead of forcing horizontal page overflow:",
      "",
      "`token-example-nebutra-5f0c9b2c-4d7e8f1a-9b3c6d9e-0f2a4b7c-8d1e3f6a`",
    ].join("\n"),
  },
};

export const Empty: Story = {
  args: {
    children: "",
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] border border-border bg-background p-4 text-foreground">
      <MessageContent>{sampleMarkdown}</MessageContent>
    </div>
  ),
};

export const NormalizationContract: Story = {
  render: () => {
    const normalized = normalizeMessageMarkdown(sampleMarkdown);

    return (
      <div className="grid gap-3">
        <MessageContent>{sampleMarkdown}</MessageContent>
        <pre className="max-h-48 overflow-auto rounded-[var(--radius-md)] border border-border bg-muted p-3 text-muted-foreground text-xs">
          {normalized}
        </pre>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText(/```text/)).toBeInTheDocument();
    expect(canvas.getByText(/1. Prepare migration window/)).toBeInTheDocument();
  },
};
