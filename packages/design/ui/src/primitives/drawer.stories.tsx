import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button } from "./button";
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

const filterOptions = ["Errors", "Warnings", "Deployments", "Webhooks", "Edge Requests"];

const meta = {
  title: "Primitives/Drawer",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Mobile bottom sheet for short, focused tasks. Use Modal for blocking desktop flows and Sheet for lateral panels.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function FilterRows() {
  return (
    <div className="grid gap-2">
      {filterOptions.map((option) => (
        <label
          key={option}
          className="flex items-center justify-between rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm"
        >
          <span>{option}</span>
          <input type="checkbox" className="size-4 accent-primary" />
        </label>
      ))}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter Logs</DrawerTitle>
          <DrawerDescription>Choose the log types shown in this view.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <FilterRows />
        </DrawerBody>
        <DrawerFooter>
          <Button>Apply Filters</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open Controlled
        </Button>
        <Drawer show={open} onDismiss={() => setOpen(false)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Deployment Region</DrawerTitle>
              <DrawerDescription>Select where the next deployment should run.</DrawerDescription>
            </DrawerHeader>
            <DrawerBody>
              <div className="grid gap-2">
                {["San Francisco", "Frankfurt", "Singapore"].map((region) => (
                  <button
                    key={region}
                    type="button"
                    className="rounded-[var(--radius-md)] border bg-card px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {region}
                  </button>
                ))}
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button onClick={() => setOpen(false)}>Save Region</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  },
};

export const CustomHeight: Story = {
  render: () => (
    <Drawer height={200}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Compact</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Quick Filter</DrawerTitle>
          <DrawerDescription>Keep the action and Cancel visible above the fold.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Apply Filter</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const ScrollableContent: Story = {
  render: () => (
    <Drawer height="70vh">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Scrollable</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notification Rules</DrawerTitle>
          <DrawerDescription>Review the rules before applying changes.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid gap-2">
            {Array.from({ length: 16 }, (_, index) => (
              <div
                key={index}
                className="rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm text-muted-foreground"
              >
                Rule {index + 1}: notify the owner when this condition matches.
              </div>
            ))}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button>Save Rules</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
