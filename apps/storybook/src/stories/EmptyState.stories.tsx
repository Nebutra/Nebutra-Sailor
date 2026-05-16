import { Inbox, Key, Users } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof EmptyState> = {
  title: "Layout/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Placeholder shown when a list or data view has no content yet. Supports icon, title, description, and CTA.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: "No data yet",
    description: "Get started by creating your first item.",
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox className="size-10" />,
    title: "Your inbox is empty",
    description: "New notifications will appear here.",
  },
};

export const WithAction: Story = {
  args: {
    icon: <Key className="size-10" />,
    title: "No API keys",
    description: "Create an API key to start making requests.",
    action: (
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 text-[color:var(--neutral-1)] text-sm font-medium"
        style={{ background: "var(--brand-gradient)" }}
      >
        Create API key
      </button>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 divide-y p-6">
      <EmptyState title="Title only" />
      <EmptyState
        title="With description"
        description="Some supporting context to help the user understand the empty state."
      />
      <EmptyState
        icon={<Users className="size-10" />}
        title="No team members"
        description="Invite your teammates to collaborate on projects."
        action={
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-[color:var(--neutral-1)] text-sm font-medium"
            style={{ background: "var(--brand-gradient)" }}
          >
            Invite member
          </button>
        }
      />
    </div>
  ),
};
