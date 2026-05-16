import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { Gauge } from "./gauge";

const meta = {
  title: "Primitives/Gauge",
  component: Gauge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A circular 0-100 ratio visual for fixed maximum comparisons such as quota usage, uptime, and cache hit rate.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "radio" },
      options: ["tiny", "small", "medium", "large"],
    },
    arcPriority: {
      control: { type: "radio" },
      options: ["default", "equal"],
    },
  },
} satisfies Meta<typeof Gauge>;

export default meta;
type Story = StoryObj<typeof meta>;

const healthColors = {
  "0": "hsl(var(--destructive))",
  "34": "hsl(var(--warning))",
  "68": "hsl(var(--success))",
};

const pinkScale = {
  "0": "var(--gauge-pink-1)",
  "10": "var(--gauge-pink-2)",
  "20": "var(--gauge-pink-3)",
  "30": "var(--gauge-pink-4)",
  "50": "var(--gauge-pink-5)",
  "60": "var(--gauge-pink-6)",
  "70": "var(--gauge-pink-7)",
  "80": "var(--gauge-pink-8)",
  "90": "var(--gauge-pink-9)",
  "100": "var(--gauge-pink-10)",
};

function GaugeRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-row items-center justify-start gap-6">{children}</div>;
}

export const Default: Story = {
  render: () => (
    <GaugeRow>
      <Gauge size="tiny" value={50} aria-label="Tiny quota usage, 50 percent" />
      <Gauge size="small" value={50} aria-label="Small quota usage, 50 percent" />
      <Gauge size="medium" value={50} aria-label="Medium quota usage, 50 percent" />
      <Gauge size="large" value={50} aria-label="Large quota usage, 50 percent" />
    </GaugeRow>
  ),
};

export const Label: Story = {
  render: () => (
    <GaugeRow>
      <Gauge showValue size="tiny" value={80} aria-label="Tiny quota usage, 80 percent" />
      <Gauge showValue size="small" value={80} aria-label="Small quota usage, 80 percent" />
      <Gauge showValue size="small" value={100} aria-label="Small quota usage, 100 percent" />
      <Gauge showValue size="medium" value={80} aria-label="Medium quota usage, 80 percent" />
      <Gauge showValue size="medium" value={100} aria-label="Medium quota usage, 100 percent" />
      <Gauge showValue size="large" value={80} aria-label="Large quota usage, 80 percent" />
      <Gauge showValue size="large" value={100} aria-label="Large quota usage, 100 percent" />
    </GaugeRow>
  ),
};

export const DefaultColorScale: Story = {
  render: () => (
    <div className="grid gap-2">
      <GaugeRow>
        <Gauge size="small" value={72} aria-labelledby="usage-ok" />
        <Gauge size="small" value={84} aria-labelledby="usage-warning" />
        <Gauge size="small" value={97} aria-labelledby="usage-danger" />
      </GaugeRow>
      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
        <span id="usage-ok">Usage 72%</span>
        <span id="usage-warning">Usage 84%</span>
        <span id="usage-danger">Usage 97%</span>
      </div>
    </div>
  ),
};

export const CustomColorRange: Story = {
  render: () => (
    <div
      className="flex flex-row items-center justify-start gap-2"
      style={
        {
          "--gauge-pink-1": "hsl(var(--muted-foreground))",
          "--gauge-pink-2": "hsl(var(--destructive) / 0.55)",
          "--gauge-pink-3": "hsl(var(--destructive) / 0.6)",
          "--gauge-pink-4": "hsl(var(--destructive) / 0.65)",
          "--gauge-pink-5": "hsl(var(--destructive) / 0.72)",
          "--gauge-pink-6": "hsl(var(--destructive) / 0.78)",
          "--gauge-pink-7": "hsl(var(--destructive) / 0.84)",
          "--gauge-pink-8": "hsl(var(--destructive) / 0.9)",
          "--gauge-pink-9": "hsl(var(--destructive) / 0.96)",
          "--gauge-pink-10": "hsl(var(--destructive))",
        } as React.CSSProperties
      }
    >
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
        <Gauge
          key={value}
          colors={pinkScale}
          size="small"
          value={value}
          aria-label={`Custom risk score, ${value} percent`}
        />
      ))}
    </div>
  ),
};

export const CustomSecondaryColor: Story = {
  render: () => (
    <Gauge
      colors={{
        primary: "hsl(var(--info))",
        secondary: "hsl(var(--info) / 0.18)",
      }}
      size="medium"
      value={50}
      aria-label="Build cache hit rate, 50 percent"
    />
  ),
};

export const ArcPriority: Story = {
  render: () => (
    <div className="grid gap-2">
      <Gauge
        arcPriority="equal"
        colors={{
          primary: "hsl(var(--info))",
          secondary: "hsl(var(--destructive))",
        }}
        showValue
        size="medium"
        value={50}
        aria-labelledby="ratio-label"
      />
      <span id="ratio-label" className="text-sm text-muted-foreground">
        Read quota ratio, 50 percent
      </span>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <GaugeRow>
      <Gauge indeterminate size="tiny" aria-label="Calculating tiny usage" />
      <Gauge indeterminate size="small" aria-label="Calculating small usage" />
      <Gauge indeterminate size="medium" aria-label="Calculating medium usage" />
      <Gauge indeterminate size="large" aria-label="Calculating large usage" />
    </GaugeRow>
  ),
};

export const LegacyHealthScale: Story = {
  render: () => (
    <GaugeRow>
      <Gauge size="small" value={14} colors={healthColors} aria-label="Health score, 14 percent" />
      <Gauge size="small" value={34} colors={healthColors} aria-label="Health score, 34 percent" />
      <Gauge size="small" value={68} colors={healthColors} aria-label="Health score, 68 percent" />
    </GaugeRow>
  ),
};
