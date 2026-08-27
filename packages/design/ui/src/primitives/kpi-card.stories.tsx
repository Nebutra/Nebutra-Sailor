import { ChartTrendingUp, Servers } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { KpiCard } from "./kpi-card";

const meta = {
  title: "Primitives/KpiCard",
  component: KpiCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Dashboard KPI card with value, icon, trend, and optional supporting description.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Active tenants",
    value: 1284,
    icon: <Servers className="size-5 text-muted-foreground" />,
    trend: { value: 12, isPositive: true },
    description: "Enterprise workspaces only",
  },
};

export const NegativeTrend: Story = {
  args: {
    title: "API calls",
    value: "8.7M",
    icon: <ChartTrendingUp className="size-5 text-muted-foreground" />,
    trend: { value: -3, isPositive: false },
    description: "Rolling seven-day window",
  },
};
