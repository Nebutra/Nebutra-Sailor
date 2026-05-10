import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Primitives/EmptyState",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Fill spaces when no content has been added yet, or is temporarily empty. " +
          "Designed to prevent confusion and guide users toward the next action.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Placeholder icon (bar-chart style — matches Geist screenshot)
// =============================================================================

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// =============================================================================
// BlankSlate — most basic, first-run experience
// =============================================================================

export const BlankSlate: Story = {
  render: () => (
    <div className="w-96 rounded-lg border bg-background">
      <EmptyState.Root
        icon={<EmptyState.Icon icon={<ChartIcon />} />}
        title="Title"
        description="A message conveying the state of the product."
      />
    </div>
  ),
};

// =============================================================================
// Informational — with CTA and learn more link
// =============================================================================

export const Informational: Story = {
  render: () => (
    <div className="w-96 rounded-lg border bg-background">
      <EmptyState.Root
        icon={<EmptyState.Icon icon={<ChartIcon />} />}
        title="Title"
        description="This should detail the actions you can take on this screen, as well as why it's valuable."
        action={
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Primary Action
          </button>
        }
        link={
          <a
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Learn more
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        }
      />
    </div>
  ),
};

// =============================================================================
// NoIcon — minimal text-only variant
// =============================================================================

export const NoIcon: Story = {
  render: () => (
    <div className="w-96 rounded-lg border bg-background">
      <EmptyState.Root
        title="No projects yet"
        description="Create your first project to get started."
        action={
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Project
          </button>
        }
      />
    </div>
  ),
};

// =============================================================================
// InTable — inside a full-width table / data container
// =============================================================================

export const InTable: Story = {
  render: () => (
    <div className="w-full rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Deployments</span>
      </div>
      <EmptyState.Root
        icon={<EmptyState.Icon icon={<FolderIcon />} />}
        title="No deployments"
        description="Push to a connected Git branch or deploy manually to see deployments here."
        link={
          <a
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View documentation
          </a>
        }
      />
    </div>
  ),
};
