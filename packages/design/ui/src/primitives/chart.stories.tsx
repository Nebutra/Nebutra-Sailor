import type { Meta, StoryObj } from "@storybook/react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

const meta = {
  title: "Primitives/Chart",
  component: ChartContainer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Recharts wrapper with theme-aware color tokens, tooltip primitives, and stable responsive sizing.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const data = [
  { month: "Jan", apiCalls: 186 },
  { month: "Feb", apiCalls: 305 },
  { month: "Mar", apiCalls: 237 },
  { month: "Apr", apiCalls: 273 },
  { month: "May", apiCalls: 209 },
  { month: "Jun", apiCalls: 314 },
];

const chartConfig = {
  apiCalls: {
    label: "API calls",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const Default: Story = {
  render: () => (
    <ChartContainer config={chartConfig} className="h-72 w-[32rem]">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="apiCalls" fill="var(--color-apiCalls)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <ChartContainer config={chartConfig} className="h-72 w-[32rem]">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="apiCalls" fill="var(--color-apiCalls)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
