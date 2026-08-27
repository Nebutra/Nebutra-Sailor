import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type ApprovalDecision, EditTool } from "./edit-tool";

const meta: Meta<typeof EditTool> = {
  title: "Primitives/EditTool",
  component: EditTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline AI tool-call rendering for file edits. Composes TextShimmer + LoadingDots. " +
          "Supports edit (LCS diff) and write (new file) variants across three states: " +
          "waiting / pending / completed. Optional approval footer.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof EditTool>;

/* -------------------------------------------------------------------------- */
/*  Shared fixtures                                                           */
/* -------------------------------------------------------------------------- */

const oldFile = `export const metadata = { title: 'Old' };

export default function Page() {
  return <div>Old content</div>;
}
`;

const newFile = `export const metadata = { title: 'Updated' };

export default function Page() {
  return (
    <div>
      <h1>Release notes</h1>
      <p>New layout applied.</p>
    </div>
  );
}
`;

const fullCreated = `import { Button } from "@nebutra/ui/primitives";

export function HeroCta() {
  return (
    <div className="flex gap-2">
      <Button variant="primary">Get started</Button>
      <Button variant="outline">Read docs</Button>
    </div>
  );
}
`;

/* -------------------------------------------------------------------------- */
/*  Stories                                                                   */
/* -------------------------------------------------------------------------- */

export const EditCompleted: Story = {
  name: "Edit — completed",
  render: () => (
    <div className="w-[520px]">
      <EditTool filePath="/app/page.tsx" oldContent={oldFile} newContent={newFile} />
    </div>
  ),
};

export const EditPending: Story = {
  name: "Edit — pending (shimmer)",
  render: () => (
    <div className="w-[520px]">
      <EditTool
        state="pending"
        filePath="/app/page.tsx"
        oldContent={oldFile}
        newContent={newFile}
      />
    </div>
  ),
};

export const Waiting: Story = {
  name: "Waiting (no body)",
  parameters: {
    docs: {
      description: {
        story: 'State before the model has produced content. Shows "Generating…" shimmer only.',
      },
    },
  },
  render: () => (
    <div className="w-[520px]">
      <EditTool state="waiting" />
    </div>
  ),
};

export const WriteCompleted: Story = {
  name: "Write — new file created",
  render: () => (
    <div className="w-[520px]">
      <EditTool variant="write" filePath="/components/hero-cta.tsx" newContent={fullCreated} />
    </div>
  ),
};

export const WithApproval: Story = {
  name: "With approval footer (interactive)",
  parameters: {
    docs: {
      description: {
        story:
          "Pending edit awaiting human approval. Click Approve to transition into a " +
          'pending "Starting…" state with animated dots. Esc rejects.',
      },
    },
  },
  render: () => {
    const [decision, setDecision] = useState<ApprovalDecision>(null);
    return (
      <div className="w-[520px] space-y-3">
        <EditTool
          state="pending"
          filePath="/app/page.tsx"
          oldContent={oldFile}
          newContent={newFile}
          approval={{
            decision,
            onDecisionChange: setDecision,
            approveLabel: "Apply",
            rejectLabel: "Skip",
          }}
        />
        <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
          decision = {JSON.stringify(decision)}
        </pre>
      </div>
    );
  },
};

export const LargeDiffOverflow: Story = {
  name: "Diff cap exceeded",
  parameters: {
    docs: {
      description: {
        story:
          "When `oldContent` or `newContent` exceeds `maxDiffLines` (default 2000), the " +
          "component bails out of LCS and renders a friendly placeholder instead of OOMing.",
      },
    },
  },
  render: () => {
    const huge = Array.from({ length: 2500 }, (_, i) => `line ${i}`).join("\n");
    return (
      <div className="w-[520px]">
        <EditTool
          filePath="/data/everything.json"
          oldContent={huge}
          newContent={`${huge}\nextra`}
          maxDiffLines={2000}
        />
      </div>
    );
  },
};

export const NoFileName: Story = {
  name: "No file path",
  render: () => (
    <div className="w-[520px]">
      <EditTool oldContent={oldFile} newContent={newFile} />
    </div>
  ),
};

export const StatsOnly: Story = {
  name: "Header stats badge",
  parameters: {
    docs: {
      description: {
        story:
          "When diff has additions or removals, the header shows compact stats `+N -N`. " +
          "Hidden during pending/waiting states (replaced by shimmer).",
      },
    },
  },
  render: () => (
    <div className="w-[520px] space-y-3">
      <EditTool filePath="/short.tsx" oldContent="A\nB\nC\n" newContent="A\nX\nC\nD\n" />
    </div>
  ),
};
