import type { Meta, StoryObj } from "@storybook/react";
import { StatusDot } from "./status-dot";

const meta = {
  title: "Primitives/StatusDot",
  component: StatusDot,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Deployment-lifecycle status dot for queued, building, ready, error, canceled, and deleted states.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: "READY",
    label: true,
    titlePrefix: "Production",
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="grid gap-3">
      <StatusDot state="QUEUED" label titlePrefix="Preview deployment" />
      <StatusDot state="BUILDING" label titlePrefix="Preview deployment" />
      <StatusDot state="READY" label titlePrefix="Production" />
      <StatusDot state="ERROR" label titlePrefix="Cron deployment" />
      <StatusDot state="CANCELED" label titlePrefix="Staging deployment" />
      <StatusDot state="DELETED" label titlePrefix="Old deployment" />
    </div>
  ),
};
