import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import {
  TreeExpander,
  TreeIcon,
  TreeLabel,
  // `TreeNodeTrigger` renders `<TreeLines />` as its first child internally —
  // it is exported separately only for a custom trigger that wants to
  // compose the connector-line layer itself.
  TreeNode,
  TreeNodeContent,
  TreeNodeTrigger,
  TreeProvider,
  TreeView,
} from "./tree";

const meta = {
  title: "Primitives/Tree",
  component: TreeProvider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "File-tree / nested-hierarchy navigator. `TreeProvider` owns all shared state (expanded ids, selection, `indent`) via context — every other export (`TreeView`, `TreeNode`, `TreeNodeTrigger`, `TreeNodeContent`, `TreeExpander`, `TreeIcon`, `TreeLabel`) must render underneath it. Nesting is expressed by nesting `TreeNode`s: a parent's `TreeNodeContent` wraps its children's `TreeNode`s, and each level needs a `level` prop one higher than its parent for indentation and connector lines to line up.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-72 rounded-[var(--radius-lg)] border border-border bg-card p-1">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TreeProvider>;

export default meta;
type Story = StoryObj<typeof TreeProvider>;

function FileNode({
  id,
  label,
  level,
  isLast,
}: {
  id: string;
  label: string;
  level: number;
  isLast: boolean;
}) {
  return (
    <TreeNode nodeId={id} level={level} isLast={isLast}>
      <TreeNodeTrigger>
        <TreeExpander hasChildren={false} />
        <TreeIcon hasChildren={false} />
        <TreeLabel>{label}</TreeLabel>
      </TreeNodeTrigger>
    </TreeNode>
  );
}

export const Default: Story = {
  render: () => (
    <TreeProvider defaultExpandedIds={["src", "components"]}>
      <TreeView>
        <TreeNode nodeId="src" level={0}>
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeIcon hasChildren />
            <TreeLabel>src</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <TreeNode nodeId="components" level={1}>
              <TreeNodeTrigger>
                <TreeExpander hasChildren />
                <TreeIcon hasChildren />
                <TreeLabel>components</TreeLabel>
              </TreeNodeTrigger>
              <TreeNodeContent hasChildren>
                <FileNode id="button" label="button.tsx" level={2} isLast={false} />
                <FileNode id="card" label="card.tsx" level={2} isLast={true} />
              </TreeNodeContent>
            </TreeNode>
            <FileNode id="index" label="index.ts" level={1} isLast={true} />
          </TreeNodeContent>
        </TreeNode>
        <FileNode id="readme" label="README.md" level={0} isLast={true} />
      </TreeView>
    </TreeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // "components" starts expanded (defaultExpandedIds)
    expect(canvas.getByText("button.tsx")).toBeVisible();

    // "src" collapses on click, taking its children with it
    await userEvent.click(canvas.getByText("src"));
    expect(canvas.queryByText("button.tsx")).toBeNull();
  },
};

/** `selectable` (default `true`) highlights the clicked row via `selectedIds`. */
export const Selectable: Story = {
  render: () => (
    <TreeProvider
      defaultExpandedIds={["src"]}
      selectedIds={["button"]}
      onSelectionChange={() => {}}
    >
      <TreeView>
        <TreeNode nodeId="src" level={0}>
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeIcon hasChildren />
            <TreeLabel>src</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <FileNode id="button" label="button.tsx" level={1} isLast={false} />
            <FileNode id="card" label="card.tsx" level={1} isLast={true} />
          </TreeNodeContent>
        </TreeNode>
      </TreeView>
    </TreeProvider>
  ),
};

/** `showLines={false}` drops the connector lines `TreeLines` draws between siblings. */
export const NoConnectorLines: Story = {
  name: "showLines={false}",
  render: () => (
    <TreeProvider defaultExpandedIds={["src"]} showLines={false}>
      <TreeView>
        <TreeNode nodeId="src" level={0}>
          <TreeNodeTrigger>
            <TreeExpander hasChildren />
            <TreeIcon hasChildren />
            <TreeLabel>src</TreeLabel>
          </TreeNodeTrigger>
          <TreeNodeContent hasChildren>
            <FileNode id="button" label="button.tsx" level={1} isLast={false} />
            <FileNode id="card" label="card.tsx" level={1} isLast={true} />
          </TreeNodeContent>
        </TreeNode>
      </TreeView>
    </TreeProvider>
  ),
};

/** An empty root — no `TreeNode`s — is a valid, if unstyled, state; pair it with an `EmptyState`. */
export const Empty: Story = {
  render: () => (
    <TreeProvider>
      <TreeView>
        <p className="p-4 text-sm text-muted-foreground">No files in this directory.</p>
      </TreeView>
    </TreeProvider>
  ),
};

/** A long label truncates (`TreeLabel` is `flex-1 truncate`) rather than wrapping and breaking row height. */
export const LongLabelOverflow: Story = {
  name: "Overflow (long label)",
  render: () => (
    <TreeProvider>
      <TreeView>
        <FileNode
          id="long"
          label="use-authenticated-workspace-billing-context-provider.tsx"
          level={0}
          isLast={true}
        />
      </TreeView>
    </TreeProvider>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark">
      <TreeProvider defaultExpandedIds={["src"]}>
        <TreeView>
          <TreeNode nodeId="src" level={0}>
            <TreeNodeTrigger>
              <TreeExpander hasChildren />
              <TreeIcon hasChildren />
              <TreeLabel>src</TreeLabel>
            </TreeNodeTrigger>
            <TreeNodeContent hasChildren>
              <FileNode id="button" label="button.tsx" level={1} isLast={true} />
            </TreeNodeContent>
          </TreeNode>
        </TreeView>
      </TreeProvider>
    </div>
  ),
};
