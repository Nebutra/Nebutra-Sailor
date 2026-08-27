import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta = {
  title: "Primitives/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Determinate and indeterminate progress primitive with Geist-compatible severity aliases, stops, and throttled aria updates.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <Progress label="Deploying project" value={64} showValue />
    </div>
  ),
};

export const Thresholds: Story = {
  render: () => (
    <div className="w-96">
      <Progress
        label="Usage"
        value={82}
        colors={{
          0: "var(--success)",
          70: "var(--warning)",
          90: "var(--destructive)",
        }}
        stops={[
          { value: 50, tooltip: "Soft limit" },
          { value: 90, tooltip: "Hard limit" },
        ]}
        showValue
      />
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="w-96">
      <Progress label="Preparing preview" value={null} />
    </div>
  ),
};
