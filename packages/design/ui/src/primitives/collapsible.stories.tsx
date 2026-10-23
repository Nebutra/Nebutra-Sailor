import { ChevronDown } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "Primitives/Collapsible",
  component: Collapsible,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Single show/hide region. The height animates and collapses to an instant swap under reduced motion. Use Accordion when several sections belong together.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = () => (
  <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
    <div className="rounded-[var(--radius-md)] border border-border px-3 py-2">@nebutra/ui</div>
    <div className="rounded-[var(--radius-md)] border border-border px-3 py-2">@nebutra/tokens</div>
    <div className="rounded-[var(--radius-md)] border border-border px-3 py-2">@nebutra/icons</div>
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Collapsible {...args}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" suffix={<ChevronDown />}>
          3 packages
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Body />
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const DefaultOpen: Story = {
  render: (args) => (
    <Collapsible {...args} defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="outline" suffix={<ChevronDown />}>
          3 packages
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Body />
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <Collapsible {...args} disabled>
      <CollapsibleTrigger asChild>
        <Button variant="outline" suffix={<ChevronDown />}>
          Locked section
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Body />
      </CollapsibleContent>
    </Collapsible>
  ),
};
