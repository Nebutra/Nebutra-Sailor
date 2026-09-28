"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@nebutra/ui/primitives";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const DATA = [
  { month: "Apr", apiCalls: 186 },
  { month: "May", apiCalls: 305 },
  { month: "Jun", apiCalls: 237 },
  { month: "Jul", apiCalls: 273 },
  { month: "Aug", apiCalls: 209 },
  { month: "Sep", apiCalls: 314 },
];

const CONFIG = {
  apiCalls: { label: "API calls (k)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function ChartDemo() {
  return (
    <div className="w-full p-6">
      <ChartContainer config={CONFIG} className="h-64 w-full">
        <BarChart data={DATA} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="apiCalls" fill="var(--color-apiCalls)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
