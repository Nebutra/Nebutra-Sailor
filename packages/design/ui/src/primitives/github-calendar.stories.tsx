import type { Meta, StoryObj } from "@storybook/react";
import { format, subDays } from "date-fns";
import { GitHubCalendar } from "./github-calendar";

const meta = {
  title: "Primitives/GitHubCalendar",
  component: GitHubCalendar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "GitHub-style contribution heatmap calendar. Shows a year of activity data as a color-intensity grid. Supports custom color scales, thresholds, and tooltips.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GitHubCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Generate sample data for the past year
function generateSampleData(days: number = 365) {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), i), "yyyy-MM-dd"),
    count: Math.random() > 0.4 ? Math.floor(Math.random() * 10) : 0,
  }));
}

const sampleData = generateSampleData();

export const Default: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar data={sampleData} />
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar
        data={sampleData}
        colors={["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"]}
      />
    </div>
  ),
};

export const OrangeTheme: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar
        data={sampleData}
        colors={["#f0f0f0", "#fce4b1", "#f9c74f", "#f3722c", "#f94144"]}
      />
    </div>
  ),
};

export const NoLabels: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar
        data={sampleData}
        showDayLabels={false}
        showMonthLabels={false}
        showLegend={false}
      />
    </div>
  ),
};

export const SixMonths: Story = {
  render: () => (
    <div className="w-[500px]">
      <GitHubCalendar data={sampleData} weeks={26} />
    </div>
  ),
};

export const CustomTooltip: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar
        data={sampleData}
        tooltipFormatter={(date, count) =>
          count === 0 ? `${date}: No activity` : `${date}: ${count} commit${count > 1 ? "s" : ""}`
        }
        legendLabels={{ less: "Fewer commits", more: "More commits" }}
      />
    </div>
  ),
};
