import { Gauge, Servers, Warning } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { MetricCard, MetricCardBordered, MetricGrid } from "./metric-card";

const meta = {
  title: "Primitives/MetricCard",
  component: MetricCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Compact dashboard metric composition with value, optional trend, description, and icon.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MetricGrid className="w-[42rem]" columns={3}>
      <MetricCardBordered
        label="Events ingested"
        value="2.4M"
        trend="up"
        trendValue="+12%"
        description="vs last week"
        icon={<Servers />}
      />
      <MetricCardBordered
        label="Error rate"
        value="0.18%"
        trend="down"
        trendValue="-0.3%"
        description="lower is better"
        icon={<Warning />}
      />
      <MetricCardBordered
        label="P95 latency"
        value="148ms"
        trend="neutral"
        trendValue="0"
        description="stable"
        icon={<Gauge />}
      />
    </MetricGrid>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid w-80 gap-4">
      <MetricCard label="Small metric" value={1284} size="sm" />
      <MetricCard label="Default metric" value={1284} />
      <MetricCard label="Large metric" value={1284} size="lg" />
    </div>
  ),
};
