import { ChartActivity } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardPanelHeader, FeaturedDashboardSection } from "./featured-dashboard-section";

const meta: Meta<typeof FeaturedDashboardSection> = {
  title: "Marketing/FeaturedDashboardSection",
  component: FeaturedDashboardSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof FeaturedDashboardSection>;

const panel = (title: string, subtitle: string) => (
  <div className="p-6">
    <DashboardPanelHeader icon={ChartActivity} label="Overview" title={title} subtitle={subtitle} />
  </div>
);

export const Default: Story = {
  args: {
    topLeft: panel("Requests", "Last 24 hours"),
    topRight: panel("Latency", "p95 across regions"),
    bottomLeft: panel("Spend", "Month to date"),
    bottomRight: panel("Errors", "Grouped by route"),
  },
};

/** Empty quadrants — the layout still holds its grid. */
export const Empty: Story = { args: {} };
