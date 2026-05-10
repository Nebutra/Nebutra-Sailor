import type { Meta, StoryObj } from "@storybook/react";
import { Description } from "./description";

const meta = {
  title: "Primitives/Description",
  component: Description,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays a brief heading and subheading to communicate any additional " +
          "information or context a user needs to continue.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    content: { control: "text" },
    tooltip: { control: "text" },
  },
} satisfies Meta<typeof Description>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Default
// =============================================================================

export const Default: Story = {
  args: {
    title: "Section Title",
    content: "Data about this section.",
  },
};

// =============================================================================
// WithTooltip
// =============================================================================

export const WithTooltip: Story = {
  args: {
    title: "Section Title",
    content: "Data about this section.",
    tooltip: "Additional context about what this section refers to.",
  },
};

// =============================================================================
// LongContent
// =============================================================================

export const LongContent: Story = {
  render: () => (
    <div className="w-80">
      <Description
        title="Deployment Region"
        content="The geographic location where your workloads are executed and data is stored."
        tooltip="Selecting a region closer to your users reduces latency."
      />
    </div>
  ),
};

// =============================================================================
// InCard
// =============================================================================

export const InCard: Story = {
  render: () => (
    <div className="w-80 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <Description
          title="Build Cache"
          content="Speeds up builds by reusing unchanged outputs."
          tooltip="Cache is invalidated when dependencies or environment variables change."
        />
        <Description
          title="Preview Deployments"
          content="Automatically deployed on every pull request."
        />
        <Description
          title="Analytics"
          content="Track visits, performance, and web vitals."
          tooltip="Data is retained for 30 days on the free plan."
        />
      </div>
    </div>
  ),
};
