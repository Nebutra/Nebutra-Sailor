import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { McpTool } from "./mcp-tool";

const meta: Meta<typeof McpTool> = {
  title: "Primitives/McpTool",
  component: McpTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline AI tool-call rendering for MCP tool invocations. Sibling of " +
          "EditTool / QuestionTool. Three states (pending / completed / interrupted), " +
          "verb conjugation, priority-sorted args, JSON pretty-print + truncation, " +
          "expandable output region.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof McpTool>;

/* -------------------------------------------------------------------------- */
/*  Shared fixtures                                                           */
/* -------------------------------------------------------------------------- */

const resourcesJson = JSON.stringify(
  [
    { id: "res_1", name: "Billing" },
    { id: "res_2", name: "Support" },
    { id: "res_3", name: "Onboarding" },
  ],
  null,
  2,
);

const customerJson = JSON.stringify(
  {
    id: "cus_8sR2x9pK",
    email: "ada@nebutra.com",
    plan: "Pro",
    created_at: "2026-05-14T08:42:00Z",
  },
  null,
  2,
);

/* -------------------------------------------------------------------------- */
/*  Stories                                                                   */
/* -------------------------------------------------------------------------- */

export const Completed: Story = {
  name: "Completed — with args + output",
  render: () => (
    <div className="w-[520px]">
      <McpTool
        name="List Resources"
        args={{ query: "active customers", limit: 25 }}
        output={resourcesJson}
      />
    </div>
  ),
};

export const Pending: Story = {
  name: "Pending (shimmer)",
  render: () => (
    <div className="w-[520px]">
      <McpTool state="pending" name="Search Documentation" />
    </div>
  ),
};

export const Interrupted: Story = {
  name: "Interrupted",
  parameters: {
    docs: {
      description: {
        story:
          'Terminal state for cancelled / timed-out / failed MCP calls. Renders as a single muted line with role="status".',
      },
    },
  },
  render: () => (
    <div className="w-[520px]">
      <McpTool state="interrupted" name="Generate Report" />
    </div>
  ),
};

export const DefaultOpen: Story = {
  name: "Completed — defaultOpen",
  render: () => (
    <div className="w-[520px]">
      <McpTool
        name="Get Customer"
        args={{ id: "cus_8sR2x9pK" }}
        output={customerJson}
        defaultOpen
      />
    </div>
  ),
};

export const Controlled: Story = {
  name: "Controlled expand",
  parameters: {
    docs: {
      description: {
        story:
          "Parent owns the expand state. Useful when multiple tool calls in a chat thread should be in sync (e.g. expand-all toggle).",
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="w-[520px] space-y-3">
        <McpTool
          name="get_customer"
          args={{ id: "cus_8sR2x9pK" }}
          output={customerJson}
          expanded={open}
          onExpandedChange={setOpen}
        />
        <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
          expanded = {String(open)}
        </pre>
      </div>
    );
  },
};

export const NameNormalization: Story = {
  name: "Name normalization (snake / camel / title)",
  parameters: {
    docs: {
      description: {
        story:
          "All three input forms render identically. The verb is conjugated to past tense for completed state.",
      },
    },
  },
  render: () => (
    <div className="flex w-[520px] flex-col gap-3">
      <McpTool name="list_resources" output={resourcesJson} />
      <McpTool name="listResources" output={resourcesJson} />
      <McpTool name="List Resources" output={resourcesJson} />
    </div>
  ),
};

export const PlainTextOutput: Story = {
  name: "Plain text output",
  render: () => (
    <div className="w-[520px]">
      <McpTool
        name="Fetch Logs"
        args={{ url: "https://logs.example.com/2026-05-14" }}
        output={
          "2026-05-14 08:42:01 INFO  worker started\n2026-05-14 08:42:02 INFO  job picked up cus_8sR2x9pK\n2026-05-14 08:42:03 WARN  rate limit at 90%"
        }
        defaultOpen
      />
    </div>
  ),
};

export const OutputTruncation: Story = {
  name: "Output truncation",
  parameters: {
    docs: {
      description: {
        story:
          "Output exceeding `maxOutputChars` is sliced with an honest suffix reporting the original length, instead of silently chopping.",
      },
    },
  },
  render: () => {
    const huge = Array.from(
      { length: 400 },
      (_, i) => `line ${i}: lorem ipsum dolor sit amet`,
    ).join("\n");
    return (
      <div className="w-[520px]">
        <McpTool
          name="Query Database"
          args={{ query: "SELECT * FROM events LIMIT 400" }}
          output={huge}
          maxOutputChars={600}
          defaultOpen
        />
      </div>
    );
  },
};

export const NoArgsNoOutput: Story = {
  name: "Header only (no args, no output)",
  render: () => (
    <div className="w-[520px]">
      <McpTool name="Check Status" />
    </div>
  ),
};
