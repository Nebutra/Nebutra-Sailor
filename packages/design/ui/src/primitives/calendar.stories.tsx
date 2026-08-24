import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "./calendar";

const meta = {
  title: "Primitives/Calendar",
  component: Calendar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Themed month grid built on react-day-picker. Backs DatePicker and any range surface, so a dark theme never hands off to an OS-drawn panel.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { mode: "single" },
  render: () => {
    const [selected, setSelected] = React.useState<Date | undefined>(new Date(2026, 7, 24));
    return (
      <div className="rounded-lg border border-border bg-popover">
        <Calendar mode="single" selected={selected} onSelect={setSelected} />
      </div>
    );
  },
};

export const Range: Story = {
  args: { mode: "range" },
  render: () => {
    const [range, setRange] = React.useState<DateRange | undefined>({
      from: new Date(2026, 7, 12),
      to: new Date(2026, 7, 20),
    });
    return (
      <div className="rounded-lg border border-border bg-popover">
        <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
      </div>
    );
  },
};

export const Bounded: Story = {
  args: { mode: "single" },
  render: () => {
    const [selected, setSelected] = React.useState<Date | undefined>();
    return (
      <div className="rounded-lg border border-border bg-popover">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          startMonth={new Date(2026, 7, 1)}
          endMonth={new Date(2026, 9, 30)}
          disabled={[{ before: new Date(2026, 7, 10) }, { after: new Date(2026, 9, 15) }]}
          defaultMonth={new Date(2026, 7, 1)}
        />
      </div>
    );
  },
};

export const WeekNumbers: Story = {
  args: { mode: "single" },
  render: () => (
    <div className="rounded-lg border border-border bg-popover">
      <Calendar mode="single" showWeekNumber weekStartsOn={1} />
    </div>
  ),
};
