import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Label } from "./label";
import { MiddleTruncate } from "./middle-truncate";
import { Slider } from "./slider";
import { Toggle } from "./toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Primitives/MiddleTruncate",
  component: MiddleTruncate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Container-aware middle truncation for strings where the start and end both identify the resource.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: "text" },
    minStartChars: { control: { type: "number", min: 1 } },
    minEndChars: { control: { type: "number", min: 1 } },
    ellipsis: { control: "text" },
  },
} satisfies Meta<typeof MiddleTruncate>;

export default meta;
type Story = StoryObj<typeof meta>;

type ExampleItem = {
  label: string;
  value: string;
  className?: string;
};

const EXAMPLES = [
  {
    label: "Branch",
    value: "feature/redesign-dashboard-navigation-with-sidebar-improvements",
    className: "font-medium",
  },
  {
    label: "Preview URL",
    value: "platform-web-git-feature-redesign-dashboard-navigation-phamous.vercel.app",
  },
  {
    label: "Deployment ID",
    value: "dpl_8gmXTT1yJRP8UbGfXD7A3sp4RKhW",
    className: "font-medium",
  },
  {
    label: "Commit SHA",
    value: "2b0874e797d7c2a4092d0033ee0c2f0f9aef2869",
    className: "font-mono",
  },
  {
    label: "File path",
    value: "apps/vercel-site/app/(dashboard)/[teamSlug]/[project]/settings/page.tsx",
  },
  {
    label: "Custom domain",
    value: "api.internal.platform-observability.example.com",
  },
  {
    label: "Model name",
    value: "google/gemini-3.1-flash-image-preview",
    className: "font-medium",
  },
  {
    label: "Fits as-is",
    value: "sidebar.tsx",
    className: "font-medium",
  },
] as const satisfies readonly ExampleItem[];

const MAX_WIDTH = 600;

function ExampleRow({ item, width }: { item: ExampleItem; width: number }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 rounded-[var(--radius-md)] border border-border bg-background px-4 py-3">
      <span className="text-muted-foreground text-sm">{item.label}</span>
      <span className="min-w-0" style={{ maxWidth: width }}>
        <MiddleTruncate
          value={item.value}
          className={item.className}
          aria-label={`${item.label}: ${item.value}`}
        />
      </span>
    </div>
  );
}

function InteractiveWidthDemo() {
  const [width, setWidth] = React.useState(MAX_WIDTH);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isAnimating) return undefined;

    const duration = 4000;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = (elapsed % duration) / duration;
      const t = progress < 0.5 ? progress * 2 : 2 - progress * 2;
      setWidth(Math.round(t * MAX_WIDTH));
      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        {EXAMPLES.map((item) => (
          <ExampleRow key={item.label} item={item} width={width} />
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <Label className="flex min-w-72 flex-1 flex-col gap-2">
          <span>Width</span>
          <span className="flex items-center gap-3">
            <Slider
              max={MAX_WIDTH}
              min={0}
              value={width}
              onValueChange={setWidth}
              className="flex-1"
            />
            <span className="min-w-16 font-mono text-muted-foreground text-sm tabular-nums">
              {width}px
            </span>
          </span>
        </Label>

        <div className="flex items-center gap-2 pb-2">
          <span>Animate</span>
          <Toggle aria-label="Animate width" checked={isAnimating} onChange={setIsAnimating} />
        </div>
      </div>
    </div>
  );
}

export const Examples: Story = {
  render: () => <InteractiveWidthDemo />,
};

export const TightWidth: Story = {
  render: () => (
    <div className="w-40 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2">
      <MiddleTruncate
        value="feature/redesign-dashboard-navigation-with-sidebar-improvements"
        className="text-sm"
      />
    </div>
  ),
};

export const WithTooltip: Story = {
  render: () => {
    const value = "apps/vercel-site/app/(dashboard)/[teamSlug]/[project]/settings/page.tsx";

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-64 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2">
            <MiddleTruncate value={value} className="text-sm" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm break-all font-mono text-xs">{value}</TooltipContent>
      </Tooltip>
    );
  },
};

export const EmptyValue: Story = {
  render: () => (
    <div className="w-48 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2">
      <MiddleTruncate value="" className="text-sm" aria-label="Empty value" />
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark w-72 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-foreground">
      <MiddleTruncate
        value="platform-web-git-feature-redesign-dashboard-navigation-phamous.vercel.app"
        className="text-sm"
      />
    </div>
  ),
};
