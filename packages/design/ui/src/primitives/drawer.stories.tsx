import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

const meta = {
  title: "Primitives/Drawer",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Slide-in panel overlay anchored to the edge of the viewport. " +
          "Built on Vaul with swipe-to-dismiss on mobile.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function OpenButton() {
  return (
    <button
      type="button"
      className="rounded-md border bg-background px-4 py-2 text-sm shadow-sm hover:bg-accent"
    >
      Open
    </button>
  );
}

// =============================================================================
// Default (bottom)
// =============================================================================

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <OpenButton />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Profile</DrawerTitle>
          <DrawerDescription>Make changes to your profile here.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Drawer body content goes here.</p>
        </DrawerBody>
        <DrawerFooter>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Save changes
          </button>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// =============================================================================
// Controlled
// =============================================================================

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border bg-background px-4 py-2 text-sm shadow-sm hover:bg-accent"
        >
          Open (controlled)
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Settings</DrawerTitle>
              <DrawerDescription>Controlled open/close example.</DrawerDescription>
            </DrawerHeader>
            <DrawerBody>
              <p className="text-sm text-muted-foreground">Controlled drawer content.</p>
            </DrawerBody>
            <DrawerFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Close
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  },
};

// =============================================================================
// DirectionRight
// =============================================================================

export const DirectionRight: Story = {
  render: () => (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <OpenButton />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Right-side drawer content.</p>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
};

// =============================================================================
// DirectionLeft
// =============================================================================

export const DirectionLeft: Story = {
  render: () => (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <OpenButton />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Left-side drawer content.</p>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
};
