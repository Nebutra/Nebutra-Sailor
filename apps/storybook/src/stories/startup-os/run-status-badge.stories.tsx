/**
 * Stories for the shared run-status badge.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StartupRunStatusBadge } from "../../../../web/src/components/startup-os/startup-run-status-badge";

const meta: Meta<typeof StartupRunStatusBadge> = {
  title: "Startup OS/Run Status Badge",
  component: StartupRunStatusBadge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One badge maps every governed-run status to a semantic Badge variant, so a run reads the same in the thread column and in the canvas inspector.",
      },
    },
  },
  args: { status: "planned" },
};
export default meta;

type Story = StoryObj<typeof StartupRunStatusBadge>;

export const Planned: Story = {};

export const WaitingForReview: Story = {
  args: { status: "waiting_for_review" },
};

export const Completed: Story = {
  args: { status: "completed" },
};

export const Failed: Story = {
  args: { status: "failed" },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <StartupRunStatusBadge status="planned" />
      <StartupRunStatusBadge status="waiting_for_review" />
      <StartupRunStatusBadge status="running" />
      <StartupRunStatusBadge status="completed" />
      <StartupRunStatusBadge status="failed" />
    </div>
  ),
};
