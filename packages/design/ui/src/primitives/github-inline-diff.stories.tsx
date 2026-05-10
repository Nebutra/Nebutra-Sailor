import type { Meta, StoryObj } from "@storybook/react";
import type { DiffLine } from "./github-inline-diff";
import { GithubInlineDiff } from "./github-inline-diff";

const meta = {
  title: "Primitives/GithubInlineDiff",
  component: GithubInlineDiff,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "GitHub-style inline diff viewer with line-level comment threads. Supports hunk headers, context lines, additions, and deletions.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GithubInlineDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleDiff: DiffLine[] = [
  { kind: "hunk", content: "@@ -1,8 +1,10 @@" },
  { kind: "context", old: 1, new: 1, content: 'import React from "react";' },
  { kind: "context", old: 2, new: 2, content: "" },
  {
    kind: "del",
    old: 3,
    new: null,
    content: 'const greeting = "Hello World";',
  },
  {
    kind: "add",
    old: null,
    new: 3,
    content: 'const greeting = "Hello, Nebutra!";',
  },
  { kind: "add", old: null, new: 4, content: 'const version = "2.0.0";' },
  { kind: "context", old: 4, new: 5, content: "" },
  {
    kind: "context",
    old: 5,
    new: 6,
    content: "export default function App() {",
  },
  { kind: "del", old: 6, new: null, content: "  return <h1>{greeting}</h1>;" },
  { kind: "add", old: null, new: 7, content: "  return (" },
  { kind: "add", old: null, new: 8, content: "    <div>" },
  { kind: "add", old: null, new: 9, content: "      <h1>{greeting}</h1>" },
  { kind: "add", old: null, new: 10, content: "      <p>v{version}</p>" },
  { kind: "add", old: null, new: 11, content: "    </div>" },
  { kind: "add", old: null, new: 12, content: "  );" },
  { kind: "context", old: 7, new: 13, content: "}" },
];

export const Default: Story = {
  render: () => (
    <div className="w-[750px]">
      <GithubInlineDiff diff={sampleDiff} fileName="src/App.tsx" fileStatus="Modified" />
    </div>
  ),
};

export const WithComments: Story = {
  render: () => (
    <div className="w-[750px]">
      <GithubInlineDiff
        diff={sampleDiff}
        fileName="src/App.tsx"
        fileStatus="Modified"
        initialComments={{
          3: [
            {
              id: "comment-1",
              author: "Alice Chen",
              initials: "AC",
              body: "Why are we changing the greeting string?",
              createdAt: "2025-01-15T10:30:00Z",
            },
          ],
        }}
        currentUser={{ name: "Bob Smith", initials: "BS" }}
      />
    </div>
  ),
};

export const AdditionsOnly: Story = {
  render: () => (
    <div className="w-[750px]">
      <GithubInlineDiff
        diff={[
          { kind: "hunk", content: "@@ -0,0 +1,5 @@" },
          {
            kind: "add",
            old: null,
            new: 1,
            content: 'import { Globe } from "@nebutra/ui";',
          },
          { kind: "add", old: null, new: 2, content: "" },
          {
            kind: "add",
            old: null,
            new: 3,
            content: "export default function Page() {",
          },
          { kind: "add", old: null, new: 4, content: "  return <Globe />;" },
          { kind: "add", old: null, new: 5, content: "}" },
        ]}
        fileName="app/page.tsx"
        fileStatus="Added"
      />
    </div>
  ),
};
