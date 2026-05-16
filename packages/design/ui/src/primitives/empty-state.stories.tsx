import {
  ChartBarPeak,
  FileText,
  FolderOpen,
  LockClosed,
  MagnifyingGlass,
  Warning,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState.Root,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Zero-content state for first-run, informational, educational, guide, no-results, cleared, permission, and error surfaces.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EmptyState.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlankSlate: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState.Root
        description="A message conveying the state of the product."
        icon={<EmptyState.Icon icon={<ChartBarPeak size={32} />} />}
        title="Title"
      />
    </div>
  ),
};

export const Informational: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState.Root
        description="This should detail the actions you can take on this screen, as well as why it's valuable."
        icon={<EmptyState.Icon icon={<ChartBarPeak size={32} />} />}
        title="Title"
        variant="informational"
      >
        <Button type="button" variant="secondary">
          Primary Action
        </Button>
        <Button asChild type="button" variant="ghost">
          <a href="/">Learn More</a>
        </Button>
      </EmptyState.Root>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid w-[52rem] grid-cols-2 gap-4">
      <EmptyState.Root
        description="Create your first project to start deploying."
        icon={<EmptyState.Icon icon={<FolderOpen size={32} />} />}
        title="No Projects Yet"
      >
        <Button type="button">Create Project</Button>
      </EmptyState.Root>
      <EmptyState.Root
        description="No logs match “status:error”. Clear the filter to see all logs."
        icon={<EmptyState.Icon icon={<MagnifyingGlass size={32} />} />}
        live
        title="No Logs Match Your Filter"
        variant="no-results"
      >
        <Button type="button" variant="secondary">
          Clear Filter
        </Button>
      </EmptyState.Root>
      <EmptyState.Root
        description="All deployment checks have completed."
        icon={<EmptyState.Icon icon={<ChartBarPeak size={32} />} />}
        title="Queue Cleared"
        variant="cleared"
      />
      <EmptyState.Root
        description="Audit exports are available with the Enterprise plan."
        icon={<EmptyState.Icon icon={<LockClosed size={32} />} />}
        title="Audit Exports Require Enterprise"
        variant="permission"
      >
        <Button type="button">Upgrade Plan</Button>
      </EmptyState.Root>
      <EmptyState.Root
        description="Couldn't load deployments. Request ID: req_7K3QZ."
        icon={<EmptyState.Icon icon={<Warning size={32} />} />}
        title="Deployments Failed To Load"
        variant="error"
      >
        <Button type="button" variant="destructive">
          Try Again
        </Button>
      </EmptyState.Root>
      <EmptyState.Root
        description="Push to your Git repository to create your first deployment."
        icon={<EmptyState.Icon icon={<FileText size={32} />} />}
        title="Deploy With Starter Content"
        variant="guide"
      >
        <Button type="button">Import Repository</Button>
        <Button type="button" variant="secondary">
          Deploy Template
        </Button>
      </EmptyState.Root>
    </div>
  ),
};

export const EdgeCases: Story = {
  render: () => (
    <div className="w-80">
      <EmptyState.Root
        align="start"
        description="No projects match “next-year-boilerplate production east-1”. Clear the filter or widen your selected environments."
        icon={<EmptyState.Icon icon={<MagnifyingGlass size={32} />} />}
        live
        title="No Projects Match Your Filters"
        variant="no-results"
      >
        <Button type="button" variant="secondary">
          Clear Filters
        </Button>
      </EmptyState.Root>
    </div>
  ),
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="w-96">
      <EmptyState.Root
        description="Invite your teammates to collaborate on projects."
        icon={<EmptyState.Icon icon={<LockClosed size={32} />} />}
        title="No Team Members"
        variant="informational"
      >
        <Button type="button">Invite Member</Button>
      </EmptyState.Root>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: () => (
    <div className="w-full max-w-sm">
      <EmptyState.Root
        description="Create your first API key to start making requests."
        icon={<EmptyState.Icon icon={<FileText size={32} />} />}
        title="No API Keys"
        variant="informational"
      >
        <Button type="button">Create API Key</Button>
      </EmptyState.Root>
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState.Root
        description="No logs match “status:error”. Clear the filter to see all logs."
        icon={<EmptyState.Icon icon={<MagnifyingGlass size={32} />} />}
        live
        title="No Logs Match Your Filter"
        variant="no-results"
      >
        <Button type="button" variant="secondary">
          Clear Filter
        </Button>
      </EmptyState.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "No Logs Match Your Filter" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Clear Filter" })).toBeVisible();
  },
};
