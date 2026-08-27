import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "./app-shell";
import { PageHeader } from "./PageHeader";

const meta: Meta<typeof AppShell> = {
  title: "Layout/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof AppShell>;

const sidebarPlaceholder = (
  <div className="flex h-full flex-col gap-2 bg-muted p-4 text-sm text-foreground">
    <div className="font-semibold tracking-tight">Sidebar</div>
    <nav className="flex flex-col gap-1 text-foreground/80">
      <span className="rounded-md px-2 py-1.5 hover:bg-background">Overview</span>
      <span className="rounded-md px-2 py-1.5 hover:bg-background">Projects</span>
      <span className="rounded-md px-2 py-1.5 hover:bg-background">Members</span>
      <span className="rounded-md px-2 py-1.5 hover:bg-background">Billing</span>
      <span className="rounded-md px-2 py-1.5 hover:bg-background">Settings</span>
    </nav>
  </div>
);

const headerPlaceholder = (
  <div className="flex w-full items-center justify-between">
    <div className="text-sm font-medium text-foreground/80">Acme Inc · Production</div>
    <div className="flex items-center gap-2 text-xs text-foreground/60">
      <span className="rounded-md border border-border px-2 py-1">Search</span>
      <span className="size-7 rounded-full bg-muted" aria-hidden="true" />
    </div>
  </div>
);

const mainPlaceholder = (
  <>
    <PageHeader
      title="Overview"
      description="A standard dashboard page rendered inside the AppShell main slot."
    />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static demo content
          key={i}
          className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-foreground/80"
        >
          Card {i + 1}
        </div>
      ))}
    </div>
  </>
);

export const Default: Story = {
  args: {
    sidebar: sidebarPlaceholder,
    header: headerPlaceholder,
    children: mainPlaceholder,
  },
};

export const CollapsedSidebar: Story = {
  args: {
    sidebar: sidebarPlaceholder,
    header: headerPlaceholder,
    children: mainPlaceholder,
    collapsed: true,
  },
};

export const WithHeader: Story = {
  args: {
    sidebar: sidebarPlaceholder,
    header: (
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">Dashboard</span>
          <span className="text-xs text-foreground/60">/ Overview</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground/60">
          <span>v1.4.2</span>
          <span className="size-7 rounded-full bg-muted" aria-hidden="true" />
        </div>
      </div>
    ),
    children: mainPlaceholder,
  },
};

export const NoHeader: Story = {
  args: {
    sidebar: sidebarPlaceholder,
    children: mainPlaceholder,
  },
};
