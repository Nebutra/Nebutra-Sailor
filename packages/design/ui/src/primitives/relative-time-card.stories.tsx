import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { RelativeTimeCard } from "./relative-time-card";

const meta: Meta<typeof RelativeTimeCard> = {
  title: "Primitives/RelativeTimeCard",
  component: RelativeTimeCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Short relative-time label (`2m` / `5h` / `Yesterday` / `3d` / `Mar 14`) " +
          "with a hover popover showing absolute UTC + local time. " +
          "Use in scannable surfaces — table cells, deploy lists, activity feeds.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof RelativeTimeCard>;

const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const Default: Story = {
  render: () => <RelativeTimeCard date={NOW - 2 * MIN} />,
};

export const AcrossMagnitudes: Story = {
  name: "Across magnitudes",
  render: () => (
    <div className="grid grid-cols-2 gap-x-12 gap-y-3 font-mono text-sm">
      <span>10s ago</span>
      <RelativeTimeCard date={NOW - 10 * 1000} />
      <span>2m ago</span>
      <RelativeTimeCard date={NOW - 2 * MIN} />
      <span>5h ago</span>
      <RelativeTimeCard date={NOW - 5 * HOUR} />
      <span>Yesterday</span>
      <RelativeTimeCard date={NOW - 26 * HOUR} />
      <span>3d ago</span>
      <RelativeTimeCard date={NOW - 3 * DAY} />
      <span>21d ago</span>
      <RelativeTimeCard date={NOW - 21 * DAY} />
      <span>~2y ago</span>
      <RelativeTimeCard date={NOW - 2 * 365 * DAY} />
    </div>
  ),
};

export const WithLeadingLabel: Story = {
  name: "Paired with a leading label",
  render: () => (
    <div className="text-sm">
      Last deploy <RelativeTimeCard date={NOW - 14 * MIN} />
    </div>
  ),
};

export const NonTimeOverride: Story = {
  name: "Non-time children override",
  render: () => (
    <RelativeTimeCard date={NOW}>
      <span className="font-mono text-sm">Just now</span>
    </RelativeTimeCard>
  ),
};

export const OnButton: Story = {
  name: "On a button trigger",
  render: () => (
    <RelativeTimeCard date={NOW - 5 * HOUR}>
      <Button variant="outline" size="sm">
        Hover me
      </Button>
    </RelativeTimeCard>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex gap-12">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <RelativeTimeCard key={side} side={side} date={NOW - 2 * HOUR} />
      ))}
    </div>
  ),
};
