import type { Meta, StoryObj } from "@storybook/react";
import { Collapse, CollapseGroup } from "./collapse";

const meta: Meta<typeof CollapseGroup> = {
  title: "Primitives/Collapse",
  component: CollapseGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Geist-style flat Collapse/CollapseGroup API on top of our Accordion. " +
          "Use for optional, advanced, or repetitive content that most users skip — " +
          "FAQ, advanced settings, request payload preview.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CollapseGroup>;

const SAMPLE = (
  <p className="text-sm">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud
    exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  </p>
);

export const Default: Story = {
  render: () => (
    <CollapseGroup>
      <Collapse title="Question A">{SAMPLE}</Collapse>
      <Collapse title="Question B">{SAMPLE}</Collapse>
    </CollapseGroup>
  ),
};

export const Expanded: Story = {
  render: () => (
    <CollapseGroup>
      <Collapse title="Question A">{SAMPLE}</Collapse>
      <Collapse title="Question B" defaultExpanded>
        {SAMPLE}
      </Collapse>
    </CollapseGroup>
  ),
};

export const Multiple: Story = {
  name: "Multiple open at once",
  render: () => (
    <CollapseGroup multiple>
      <Collapse title="Question A" defaultExpanded>
        {SAMPLE}
      </Collapse>
      <Collapse title="Question B" defaultExpanded>
        {SAMPLE}
      </Collapse>
    </CollapseGroup>
  ),
};

export const SmallSize: Story = {
  name: "Small (standalone)",
  render: () => (
    <Collapse size="small" title="Question A">
      {SAMPLE}
    </Collapse>
  ),
};

export const Standalone: Story = {
  name: "Standalone (no group)",
  render: () => (
    <Collapse title="One-off panel" defaultExpanded>
      {SAMPLE}
    </Collapse>
  ),
};
