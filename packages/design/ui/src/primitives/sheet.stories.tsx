import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const sides = ["top", "right", "bottom", "left"] as const;

const meta = {
  title: "Primitives/Sheet",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Contextual edge panel for persistent detail surfaces. Use Dialog for blocking decisions and Drawer for mobile bottom sheets.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DetailRows() {
  return (
    <dl className="grid gap-3">
      {[
        ["Environment", "Production"],
        ["Region", "iad1"],
        ["Last Active", "2 minutes ago"],
      ].map(([label, value]) => (
        <div
          className="grid gap-1 rounded-[var(--radius-lg)] border border-border bg-muted/40 p-3"
          key={label}
        >
          <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
          <dd className="text-foreground text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DefaultSheetExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Deployment Details</SheetTitle>
          <SheetDescription>Review the live deployment without leaving the list.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <DetailRows />
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button>Open Deployment</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export const Default: Story = {
  render: () => <DefaultSheetExample />,
};

export const AllSides: Story = {
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">Open {side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>
                {side[0]?.toUpperCase()}
                {side.slice(1)} Context
              </SheetTitle>
              <SheetDescription>This panel opens from the {side} edge.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p className="text-muted-foreground text-sm">
                Use the edge that preserves the strongest spatial relationship with the trigger.
              </p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Long Content</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Audit Trail</SheetTitle>
          <SheetDescription>Recent events stay scrollable inside the sheet body.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-2">
            {Array.from({ length: 18 }, (_, index) => (
              <div
                className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-card-foreground text-sm"
                key={index}
              >
                Event {index + 1}: deployment metadata was updated by the platform.
              </div>
            ))}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  ),
};

export const NoOverlay: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Without Overlay</Button>
      </SheetTrigger>
      <SheetContent noOverlay>
        <SheetHeader>
          <SheetTitle>Member Profile</SheetTitle>
          <SheetDescription>
            The page remains visually available behind this panel.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <DetailRows />
        </SheetBody>
      </SheetContent>
    </Sheet>
  ),
};

export const AsyncStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Loading State</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Project Settings</SheetTitle>
            <SheetDescription>Loading metadata from the workspace.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="grid gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="h-10 rounded-[var(--radius-md)] bg-muted" key={index} />
              ))}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Error State</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Project Settings</SheetTitle>
            <SheetDescription>Unable to load this panel.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="rounded-[var(--radius-lg)] border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
              Workspace metadata could not be loaded. Try again from the project page.
            </div>
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
            <Button>Retry</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark">
      <DefaultSheetExample />
    </div>
  ),
};
