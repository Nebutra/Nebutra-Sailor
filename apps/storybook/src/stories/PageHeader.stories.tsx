import { PageHeader } from "@nebutra/ui/layout";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PageHeader> = {
  title: "Layout/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Standardised top-of-page header used on every dashboard page. Supports title, description, and an actions slot.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: "Team Settings",
    description: "Manage your team members and their permissions.",
  },
};

export const WithActions: Story = {
  args: {
    title: "API Keys",
    description: "Create and revoke API keys for programmatic access.",
    actions: (
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 text-[color:var(--neutral-1)] text-sm font-medium"
        style={{ background: "var(--brand-gradient)" }}
      >
        Create key
      </button>
    ),
  },
};

export const TitleOnly: Story = {
  args: { title: "Analytics" },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader title="Title only" />
      <PageHeader title="With description" description="Supporting context about this page." />
      <PageHeader
        title="With actions"
        description="Full header with CTA."
        actions={
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-[color:var(--neutral-1)] text-sm font-medium"
            style={{ background: "var(--brand-gradient)" }}
          >
            Primary action
          </button>
        }
      />
    </div>
  ),
};
