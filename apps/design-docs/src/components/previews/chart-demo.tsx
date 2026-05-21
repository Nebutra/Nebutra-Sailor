"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
    label: "API Calls",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ChartDemo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-72 w-full max-w-lg rounded-[var(--radius-lg)] bg-muted/40" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full max-w-lg">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="apiCalls" fill="var(--color-apiCalls)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
