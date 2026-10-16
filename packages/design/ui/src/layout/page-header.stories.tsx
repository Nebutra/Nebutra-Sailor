import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "./PageHeader";

const meta: Meta<typeof PageHeader> = {
  title: "Layout/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

const trail = (
  <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
    <a href="#settings">Settings</a> <span aria-hidden="true">/</span>{" "}
    <span className="text-foreground">Security</span>
  </nav>
);

export const Default: Story = {
  args: {
    title: "Usage",
    description: "Credits, API calls and token consumption across your workspace.",
  },
};

export const TitleOnly: Story = {
  args: { title: "Analytics" },
};

export const WithActions: Story = {
  args: {
    title: "API keys",
    description: "Create and revoke API keys for programmatic access.",
    actions: <button type="button">Create key</button>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-10">
      <PageHeader
        breadcrumbs={trail}
        title="Security"
        size="section"
        description="Password, linked accounts, two-step verification and sessions."
      />
      <PageHeader
        title="Connectors"
        description="Bring your stack into the workspace."
        actions={<button type="button">Add connector</button>}
        meta={<span>3 connected · last sync 2 minutes ago</span>}
        divider
      />
    </div>
  ),
};
