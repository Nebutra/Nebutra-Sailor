import type { Meta, StoryObj } from "@storybook/react";
import { NoisePatternCard, NoisePatternCardBody } from "./noise-pattern-card";

const meta = {
  title: "Primitives/NoisePatternCard",
  component: NoisePatternCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card with an animated noise texture background. The organic grain texture adds depth while maintaining a modern dark aesthetic. Requires bg-noise-pattern Tailwind utility.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NoisePatternCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: <></> },
  render: () => (
    <NoisePatternCard className="max-w-sm">
      <NoisePatternCardBody>
        <h3 className="text-lg font-semibold text-white">Noise Pattern Card</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A sophisticated dark card with an organic grain texture that adds depth and visual
          interest.
        </p>
      </NoisePatternCardBody>
    </NoisePatternCard>
  ),
};

export const WithStats: Story = {
  args: { children: <></> },
  render: () => (
    <NoisePatternCard className="max-w-sm">
      <NoisePatternCardBody>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This Month
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            { label: "Requests", value: "1.2M" },
            { label: "Uptime", value: "99.9%" },
            { label: "Latency", value: "48ms" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </NoisePatternCardBody>
    </NoisePatternCard>
  ),
};

export const Grid: Story = {
  args: { children: <></> },
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[500px]">
      {[
        { title: "Infrastructure", desc: "Auto-scaling compute" },
        { title: "Security", desc: "End-to-end encrypted" },
        { title: "Monitoring", desc: "Real-time observability" },
        { title: "Deployment", desc: "Zero-downtime releases" },
      ].map((item) => (
        <NoisePatternCard key={item.title}>
          <NoisePatternCardBody>
            <h4 className="font-semibold text-white">{item.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
          </NoisePatternCardBody>
        </NoisePatternCard>
      ))}
    </div>
  ),
};

export const CustomOverlay: Story = {
  args: { children: <></> },
  render: () => (
    <NoisePatternCard overlayClassName="bg-purple-950/20" className="max-w-sm">
      <NoisePatternCardBody>
        <h3 className="text-lg font-semibold text-purple-200">Purple Tint</h3>
        <p className="mt-2 text-sm text-purple-300/70">
          Custom overlay color applied over the noise pattern.
        </p>
      </NoisePatternCardBody>
    </NoisePatternCard>
  ),
};
