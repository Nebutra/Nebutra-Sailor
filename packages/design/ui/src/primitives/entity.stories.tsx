import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Entity } from "./entity";

const meta = {
  title: "Primitives/Entity",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays up-to-two columns of content. The left column can contain arbitrary content, " +
          "and the right column typically contains controls or actions related to the content in the left column.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Avatar placeholder
// =============================================================================

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

// =============================================================================
// Default — single entity row with avatar + metadata
// =============================================================================

export const Default: Story = {
  render: () => (
    <div className="w-96 rounded-lg border bg-background">
      <Entity
        left={<Avatar name="Evil Rabbit" />}
        right={<p className="text-sm text-muted-foreground">Connected 1h ago</p>}
      >
        <Entity.Content title="Evil Rabbit" description="@Glenn Hitchcock (@gin)" fill />
      </Entity>
    </div>
  ),
};

// =============================================================================
// WithSkeleton — loading placeholder inside Entity layout
// =============================================================================

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

export const WithSkeleton: Story = {
  render: () => (
    <div className="w-96 rounded-lg border bg-background">
      <Entity>
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </Entity>
    </div>
  ),
};

// =============================================================================
// EntityList — stacked items in a bordered list
// =============================================================================

const sessions = [
  {
    id: "github",
    title: "GitHub Desktop on MacBook Pro",
    description: "Last used just now",
  },
  {
    id: "vscode",
    title: "VS Code on Windows 11",
    description: "Last used 10min ago",
  },
  {
    id: "terminal",
    title: "Terminal on Ubuntu 24.04",
    description: "Last used 25min ago",
  },
];

export const WithList: Story = {
  render: () => {
    const [declined, setDeclined] = React.useState<Record<string, boolean>>({});
    return (
      <div className="w-96">
        <Entity.List>
          {sessions.map((session) => (
            <Entity
              key={session.id}
              as="li"
              right={
                declined[session.id] ? (
                  <span className="text-xs text-muted-foreground">Declined</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeclined((prev) => ({ ...prev, [session.id]: true }))}
                    className="rounded-md border px-3 py-1 text-xs hover:bg-accent"
                  >
                    Decline
                  </button>
                )
              }
            >
              <Entity.Content title={session.title} description={session.description} fill />
            </Entity>
          ))}
        </Entity.List>
      </div>
    );
  },
};

// =============================================================================
// MultipleLeftSlot — icon + content side-by-side
// =============================================================================

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-muted-foreground"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

export const WithIconLeft: Story = {
  render: () => (
    <div className="w-96">
      <Entity.List>
        {["Production key", "Development key", "Preview key"].map((name) => (
          <Entity
            key={name}
            as="li"
            left={<KeyIcon />}
            right={
              <button type="button" className="rounded-md border px-3 py-1 text-xs hover:bg-accent">
                Revoke
              </button>
            }
          >
            <Entity.Content title={name} description="sk-proj-••••••••••••••••" fill />
          </Entity>
        ))}
      </Entity.List>
    </div>
  ),
};
