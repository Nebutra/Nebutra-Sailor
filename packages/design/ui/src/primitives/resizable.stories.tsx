import type { Meta, StoryObj } from "@storybook/react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

const meta = {
  title: "Primitives/Resizable",
  component: ResizablePanelGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Split panes the user can resize by dragging or with the arrow keys on a focused handle. `withHandle` adds a visible grip.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const Pane = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
    {label}
  </div>
);

export const Horizontal: Story = {
  render: () => (
    <div className="h-48 w-[32rem] overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={30} minSize={15}>
          <Pane label="Sidebar" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <Pane label="Content" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="h-64 w-[24rem] overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize={60}>
          <Pane label="Editor" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={20}>
          <Pane label="Terminal" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const ThreePanes: Story = {
  render: () => (
    <div className="h-48 w-[40rem] overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={20} minSize={10}>
          <Pane label="Files" />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={55}>
          <Pane label="Editor" />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25} minSize={10}>
          <Pane label="Outline" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
