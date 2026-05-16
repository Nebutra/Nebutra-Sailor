import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { ContextCard } from "./context-card";

const meta = {
  title: "Primitives/ContextCard",
  component: ContextCard.Trigger,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hover/focus card for entity metadata in dense product surfaces. " +
          "Built on Base UI Popover so richer content and a single action remain reachable.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextCard.Trigger>;

export default meta;
type Story = StoryObj<typeof meta>;

const PROJECT_CONTENT = (
  <ContextCard.Entity
    title="Nebula Console"
    description="nebutra/production"
    metadata={[
      { label: "Plan", value: "Pro" },
      { label: "Owner", value: "Platform" },
      { label: "Last Active", value: "2m ago" },
    ]}
  />
);

export const Default: Story = {
  args: {
    content: PROJECT_CONTENT,
    side: "top",
    children: (
      <button
        type="button"
        className="cursor-default underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Nebula Console
      </button>
    ),
  },
};

export const AllSides: Story = {
  render: () => (
    <div className="flex flex-row items-stretch justify-around gap-16">
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={PROJECT_CONTENT} side="top">
          <button type="button" className="cursor-default underline decoration-dotted">
            Top
          </button>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={PROJECT_CONTENT} side="bottom">
          <button type="button" className="cursor-default underline decoration-dotted">
            Bottom
          </button>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={PROJECT_CONTENT} side="left">
          <button type="button" className="cursor-default underline decoration-dotted">
            Left
          </button>
        </ContextCard.Trigger>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ContextCard.Trigger content={PROJECT_CONTENT} side="right">
          <button type="button" className="cursor-default underline decoration-dotted">
            Right
          </button>
        </ContextCard.Trigger>
      </div>
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <ContextCard.Trigger
      side="top"
      content={
        <ContextCard.Entity
          title="API Gateway"
          description="api.nebutra.com"
          metadata={[
            { label: "Region", value: "Singapore" },
            { label: "Status", value: "Healthy" },
            { label: "Created", value: "May 12, 2026" },
          ]}
          action={
            <Button size="tiny" variant="outline" className="w-full">
              Open Project
            </Button>
          }
        />
      }
    >
      <button type="button" className="cursor-default underline decoration-dotted">
        API Gateway
      </button>
    </ContextCard.Trigger>
  ),
};

export const LongText: Story = {
  render: () => (
    <ContextCard.Trigger
      side="right"
      content={
        <ContextCard.Entity
          title="Very long production deployment name that should truncate without resizing the panel"
          description="edge-gateway-blue-green-rollout.nebutra.example.com"
          metadata={[
            { label: "Owner", value: "Infrastructure Experience Platform" },
            { label: "Last Active", value: "less than a minute ago" },
            { label: "Plan", value: "Enterprise" },
          ]}
        />
      }
    >
      <button type="button" className="cursor-default underline decoration-dotted">
        Long deployment row
      </button>
    </ContextCard.Trigger>
  ),
};

export const EmptyValue: Story = {
  render: () => (
    <ContextCard.Trigger
      side="top"
      content={
        <ContextCard.Entity
          title="Unassigned API key"
          description="Created by system migration"
          metadata={[
            { label: "Owner" },
            { label: "Last Used" },
            { label: "Scope", value: "Read only" },
          ]}
        />
      }
    >
      <button type="button" className="cursor-default underline decoration-dotted">
        Empty values
      </button>
    </ContextCard.Trigger>
  ),
};

export const Loading: Story = {
  render: () => (
    <ContextCard.Trigger
      side="bottom"
      content={
        <ContextCard.Entity
          title="Loading deployment"
          description="Metadata is still syncing"
          metadata={[
            { label: "Plan", value: "Loading..." },
            { label: "Owner", value: "Loading..." },
            { label: "Last Active", value: "Loading..." },
          ]}
        />
      }
    >
      <Button variant="outline" loading>
        Syncing
      </Button>
    </ContextCard.Trigger>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <ContextCard.Trigger
      side="bottom"
      content={
        <ContextCard.Entity
          title="Webhook delivery failed"
          description="Retry from the webhook detail page."
          metadata={[
            { label: "Status", value: "Error" },
            { label: "Attempts", value: "3" },
            { label: "Last Response", value: "500" },
          ]}
          action={
            <Button size="tiny" variant="outline" className="w-full">
              View Delivery
            </Button>
          }
        />
      }
    >
      <Button variant="outline">Failed webhook</Button>
    </ContextCard.Trigger>
  ),
};

export const KeyboardReachable: Story = {
  render: () => (
    <ContextCard.Trigger
      side="bottom"
      content={
        <ContextCard.Entity
          title="Keyboard contract"
          description="Focus the trigger, then press Enter or ArrowDown."
          metadata={[
            { label: "Opens On", value: "Hover / focus" },
            { label: "Closes On", value: "Escape / blur" },
          ]}
          action={
            <Button size="tiny" variant="outline" className="w-full">
              Focusable Action
            </Button>
          }
        />
      }
    >
      <Button variant="outline">Keyboard trigger</Button>
    </ContextCard.Trigger>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-8 text-foreground">
      <ContextCard.Trigger content={PROJECT_CONTENT} side="top">
        <button type="button" className="cursor-default underline decoration-dotted">
          Dark surface
        </button>
      </ContextCard.Trigger>
    </div>
  ),
};
