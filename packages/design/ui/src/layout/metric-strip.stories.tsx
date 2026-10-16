import type { Meta, StoryObj } from "@storybook/react";
import { Metric, MetricStrip, Sparkline } from "./metric-strip";

const meta: Meta<typeof MetricStrip> = {
  title: "Layout/MetricStrip",
  component: MetricStrip,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MetricStrip>;

const TREND = [12, 18, 15, 22, 28, 24, 31, 35, 33, 41, 46, 52];

export const Default: Story = {
  render: () => (
    <MetricStrip>
      <Metric
        label="Credit balance"
        value="12,480"
        unit="credits"
        footnote="$124.80 available"
        trend={TREND}
      />
      <Metric
        label="API calls"
        value="48,210"
        delta={{ value: "+12.4%", tone: "positive" }}
        trend={TREND}
      />
      <Metric label="Error rate" value="0.42%" delta={{ value: "+0.1%", tone: "negative" }} />
    </MetricStrip>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <MetricStrip columns={4}>
        <Metric label="Requests" value="1.2M" trend={TREND} />
        <Metric label="Tokens" value="88.4M" trend={[...TREND].reverse()} />
        <Metric label="p95 latency" value="412" unit="ms" />
        <Metric label="Period" value="Oct 2026" footnote="Resets in 15 days" />
      </MetricStrip>
      <MetricStrip>
        <Metric label="Empty" value="—" />
        <Metric label="Empty" value="—" />
      </MetricStrip>
      <div className="w-40 text-foreground">
        <Sparkline data={TREND} label="Requests rising over 12 days" />
      </div>
    </div>
  ),
};
