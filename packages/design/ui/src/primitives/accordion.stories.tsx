import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const meta = {
  title: "Primitives/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A set of vertically stacked headings that each reveal a related section of content. Also known as Collapse.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const loremA =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const loremB =
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Question A</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremA}</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Question B</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremB}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Expanded: Story = {
  render: () => (
    <div className="w-[480px]">
      <Accordion type="single" collapsible defaultValue="item-2">
        <AccordionItem value="item-1">
          <AccordionTrigger>Question A</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremA}</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Question B</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremB}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="w-[480px]">
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Question A</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremA}</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Question B</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremB}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Small: Story = {
  render: () => (
    <div className="w-[480px]">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger size="small">Question A</AccordionTrigger>
          <AccordionContent size="small">
            <p className="text-sm text-muted-foreground">{loremA}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[480px]">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Enabled item</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremA}</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2" disabled>
          <AccordionTrigger>Disabled item</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">{loremB}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState("");

    return (
      <div className="w-[480px]">
        <div className="mb-4 text-sm text-muted-foreground">Active: {value || "none"}</div>
        <Accordion type="single" collapsible value={value} onValueChange={setValue}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Question A</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">{loremA}</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Question B</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">{loremB}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  },
};
