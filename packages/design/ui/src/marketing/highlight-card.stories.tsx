import { ChartActivity } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { HighlightCard } from "./highlight-card";

const meta: Meta<typeof HighlightCard> = {
  title: "Marketing/HighlightCard",
  component: HighlightCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof HighlightCard>;

export const Default: Story = {
  args: {
    title: "Usage-based billing",
    description: "Meter every call and bill on real consumption, not seats.",
    metricValue: "1.2M",
    metricLabel: "events / day",
    buttonText: "See how metering works",
    icon: <ChartActivity className="size-5" />,
  },
};
