import type { Meta, StoryObj } from "@storybook/react";
import { format, subDays } from "date-fns";
import {
  fromWeeklyCommitActivity,
  GitHubCalendar,
  type WeeklyCommitActivity,
} from "./github-calendar";

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
type Story = StoryObj<typeof GitHubCalendar>;

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

// Deterministic 52-week fixture shaped like GitHub's REST
// `/repos/{owner}/{repo}/stats/commit_activity` response, fed through
// `fromWeeklyCommitActivity` to exercise the real adapter path.
function generateWeeklyCommitActivity(weekCount = 52): WeeklyCommitActivity[] {
  // Simple deterministic PRNG (mulberry32) so the story renders identically
  // on every load without pulling in a random-data dependency.
  let seed = 42;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // First Sunday at least `weekCount` weeks before today.
  const today = new Date();
  const mostRecentSunday = subDays(today, today.getDay());
  const firstWeekStart = subDays(mostRecentSunday, (weekCount - 1) * 7);

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = subDays(firstWeekStart, -(weekIndex * 7));
    const days = Array.from({ length: 7 }, () => (next() > 0.35 ? Math.floor(next() * 12) : 0));
    return {
      week: Math.floor(weekStart.getTime() / 1000),
      days,
      total: days.reduce((sum, count) => sum + count, 0),
    };
  });
}

const repoActivityData = fromWeeklyCommitActivity(generateWeeklyCommitActivity());

export const RepoActivity: Story = {
  render: () => (
    <div className="w-[800px]">
      <GitHubCalendar
        data={repoActivityData}
        weeks={52}
        tooltipFormatter={(date, count) =>
          count === 0 ? `${date}: no commits` : `${date}: ${count} commit${count > 1 ? "s" : ""}`
        }
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Fed from `fromWeeklyCommitActivity`, converting GitHub's REST `/repos/{owner}/{repo}/stats/commit_activity` response (weekly `{ week, days }` buckets) into the `ContributionDay[]` shape this component consumes.",
      },
    },
  },
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
