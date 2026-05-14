import type { Meta, StoryObj } from "@storybook/react";
import { type TodoItem, TodoTool } from "./todo-tool";

const meta: Meta<typeof TodoTool> = {
  title: "Primitives/TodoTool",
  component: TodoTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline AI tool-call rendering for the Claude TodoWrite tool family. " +
          "Sibling of EditTool / QuestionTool / McpTool. Flat, read-only, " +
          "with a streaming `loading` state. Distinct from AgentPlan — see " +
          "header docblock for the boundary.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof TodoTool>;

const inFlight: TodoItem[] = [
  { content: "Audit components", status: "completed" },
  { content: "Tighten spacing", status: "in_progress" },
  { content: "Ship updates", status: "pending" },
];

const allPending: TodoItem[] = [
  { content: "Audit components", status: "pending" },
  { content: "Tighten spacing", status: "pending" },
  { content: "Ship updates", status: "pending" },
];

const allDone: TodoItem[] = [
  { content: "Audit components", status: "completed" },
  { content: "Tighten spacing", status: "completed" },
  { content: "Ship updates", status: "completed" },
];

export const InProgress: Story = {
  name: "Ready — mid-flight (mixed statuses)",
  render: () => (
    <div className="w-[420px]">
      <TodoTool todos={inFlight} />
    </div>
  ),
};

export const AllPending: Story = {
  name: "Ready — all pending",
  render: () => (
    <div className="w-[420px]">
      <TodoTool todos={allPending} />
    </div>
  ),
};

export const AllCompleted: Story = {
  name: "Ready — all completed",
  render: () => (
    <div className="w-[420px]">
      <TodoTool todos={allDone} />
    </div>
  ),
};

export const LoadingCreating: Story = {
  name: 'Loading — mode="creating"',
  render: () => (
    <div className="w-[420px]">
      <TodoTool state="loading" mode="creating" />
    </div>
  ),
};

export const LoadingUpdating: Story = {
  name: 'Loading — mode="updating"',
  render: () => (
    <div className="w-[420px]">
      <TodoTool state="loading" mode="updating" />
    </div>
  ),
};

export const Dimmed: Story = {
  name: "Dimmed (AI mid-revision)",
  parameters: {
    docs: {
      description: {
        story:
          'When the AI is revising the list, set `dimmed` so the current snapshot looks softened — the "active" item indicator is suppressed.',
      },
    },
  },
  render: () => (
    <div className="w-[420px]">
      <TodoTool todos={inFlight} dimmed />
    </div>
  ),
};

export const EmptyReady: Story = {
  name: "Ready — empty list renders nothing",
  parameters: {
    docs: {
      description: {
        story:
          'state="ready" + empty todos returns null. The caller decides whether to render an empty-state placeholder upstream.',
      },
    },
  },
  render: () => (
    <div className="w-[420px] rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
      <p className="mb-2">(component output below — should be nothing)</p>
      <TodoTool todos={[]} />
    </div>
  ),
};

export const StableKeyOnStatusFlip: Story = {
  name: "Stable key — status flip doesn't remount",
  parameters: {
    docs: {
      description: {
        story:
          "Keys are derived from `id` (if provided) or `${idx}-${content[0..16]}`. Status transitions on the same item do not change the key, so React reconciles in place.",
      },
    },
  },
  render: () => (
    <div className="w-[420px]">
      <TodoTool
        todos={[
          { id: "t1", content: "Audit components", status: "completed" },
          { id: "t2", content: "Tighten spacing", status: "in_progress" },
          { id: "t3", content: "Ship updates", status: "pending" },
        ]}
      />
    </div>
  ),
};
