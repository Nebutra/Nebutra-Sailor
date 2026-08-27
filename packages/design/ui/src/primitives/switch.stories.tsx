import { GridSquare, ListUnordered } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Switch } from "./switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Segmented radio selector for 2-3 mutually exclusive views of the same surface.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Switch name="default">
      <Switch.Control defaultChecked label="Source" value="source" />
      <Switch.Control label="Output" value="output" />
    </Switch>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("source");

    return (
      <div className="grid gap-3">
        <Switch name="controlled" onValueChange={setValue} value={value}>
          <Switch.Control label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
        <p className="text-muted-foreground text-sm">Selected: {value}</p>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <Switch name="disabled" disabled>
      <Switch.Control defaultChecked label="Source" value="source" />
      <Switch.Control label="Output" value="output" />
    </Switch>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      {(["small", "medium", "large"] as const).map((size) => (
        <Switch key={size} name={`sizes-${size}`} size={size}>
          <Switch.Control defaultChecked label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
      ))}
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className="w-96 max-w-full">
      <Switch name="full-width" className="w-full">
        <Switch.Control defaultChecked label="Source" size="large" value="source" />
        <Switch.Control label="Output" size="large" value="output" />
      </Switch>
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      {(["small", "medium", "large"] as const).map((size) => (
        <Switch key={size} name={`icons-${size}`} size={size}>
          <Switch.Control defaultChecked icon={<GridSquare />} label="Grid View" value="grid" />
          <Switch.Control icon={<ListUnordered />} label="List View" value="list" />
        </Switch>
      ))}
    </div>
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <TooltipProvider delayDuration={150}>
      <Switch name="tooltip" size="large">
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch.Control defaultChecked label="Source" value="source" />
          </TooltipTrigger>
          <TooltipContent>View Source</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch.Control label="Output" value="output" />
          </TooltipTrigger>
          <TooltipContent>View Output</TooltipContent>
        </Tooltip>
      </Switch>
    </TooltipProvider>
  ),
};

export const LongLabels: Story = {
  render: () => (
    <Switch name="long-labels" className="w-96 max-w-[calc(100vw-2rem)]">
      <Switch.Control defaultChecked label="Generated Source" value="source" />
      <Switch.Control label="Rendered Output" value="output" />
    </Switch>
  ),
};
