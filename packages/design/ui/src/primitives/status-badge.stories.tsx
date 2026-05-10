import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, CheckCircle2, Globe, Info, Server, ShieldCheck, XCircle } from "lucide-react";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "Primitives/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Two-part status indicator badge with left/right labels, optional icons, and status-based icon coloring.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["success", "error", "warning", "info", "default"],
    },
    leftLabel: { control: "text" },
    rightLabel: { control: "text" },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    leftIcon: CheckCircle2,
    leftLabel: "Live",
    rightLabel: "v2.1.0",
    status: "success",
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusBadge
        leftIcon={CheckCircle2}
        leftLabel="Success"
        rightLabel="All systems operational"
        status="success"
      />
      <StatusBadge
        leftIcon={AlertCircle}
        leftLabel="Warning"
        rightLabel="High latency detected"
        status="warning"
      />
      <StatusBadge
        leftIcon={XCircle}
        leftLabel="Error"
        rightLabel="Service unavailable"
        status="error"
      />
      <StatusBadge
        leftIcon={Info}
        leftLabel="Info"
        rightLabel="Maintenance scheduled"
        status="info"
      />
      <StatusBadge leftLabel="Default" rightLabel="No status set" status="default" />
    </div>
  ),
};

export const WithBothIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusBadge
        leftIcon={ShieldCheck}
        rightIcon={XCircle}
        leftLabel="Protection"
        rightLabel="SSO disabled"
        status="success"
      />
      <StatusBadge
        leftIcon={Globe}
        rightIcon={CheckCircle2}
        leftLabel="Region"
        rightLabel="us-east-1"
        status="info"
      />
      <StatusBadge
        leftIcon={Server}
        rightIcon={AlertCircle}
        leftLabel="Compute"
        rightLabel="2 degraded"
        status="warning"
      />
    </div>
  ),
};

export const NoIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusBadge leftLabel="Environment" rightLabel="Production" status="success" />
      <StatusBadge leftLabel="Tier" rightLabel="Enterprise" status="info" />
      <StatusBadge leftLabel="Region" rightLabel="us-east-1" />
    </div>
  ),
};

export const InDashboard: Story = {
  render: () => (
    <div className="space-y-3 rounded-lg border bg-card p-4 max-w-sm">
      <h3 className="font-semibold text-sm">System Status</h3>
      <div className="flex flex-wrap gap-2">
        <StatusBadge
          leftIcon={CheckCircle2}
          leftLabel="API"
          rightLabel="Healthy"
          status="success"
        />
        <StatusBadge leftIcon={CheckCircle2} leftLabel="DB" rightLabel="Healthy" status="success" />
        <StatusBadge
          leftIcon={AlertCircle}
          leftLabel="CDN"
          rightLabel="Degraded"
          status="warning"
        />
      </div>
    </div>
  ),
};
