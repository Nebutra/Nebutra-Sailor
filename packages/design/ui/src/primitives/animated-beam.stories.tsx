import { Database, LogoGithub, LogoSlack, Servers, Workflow } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { useRef } from "react";
import { AnimatedBeam } from "./animated-beam";

const meta = {
  title: "Primitives/AnimatedBeam",
  component: AnimatedBeam,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Tokenized data-flow connector for integration diagrams and workflow surfaces. Use semantic tone/intensity first; raw SVG paint props are advanced escape hatches.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AnimatedBeam>;

export default meta;
type Story = StoryObj<typeof meta>;

function FlowNode({
  ref,
  icon,
  title,
  description,
}: {
  ref: React.Ref<HTMLDivElement>;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      ref={ref}
      className="relative z-10 flex min-w-28 flex-col items-center gap-2 rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-3 text-center shadow-sm dark:border-white/10 dark:bg-[var(--neutral-2)]"
    >
      <div className="flex size-9 items-center justify-center rounded-md border border-[var(--neutral-6)] bg-[var(--neutral-2)] text-[var(--neutral-12)]">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-[var(--neutral-12)]">{title}</p>
        <p className="text-[11px] text-[var(--neutral-11)]">{description}</p>
      </div>
    </div>
  );
}

function FlowSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative min-h-[260px] w-[680px] overflow-hidden rounded-lg border border-[var(--neutral-7)] bg-[radial-gradient(circle_at_50%_0%,var(--blue-2),transparent_42%),var(--neutral-1)] p-8 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function ProductFlowDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  return (
    <FlowSurface>
      <div
        ref={containerRef}
        className="relative flex h-full min-h-[196px] items-center justify-between"
      >
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[linear-gradient(90deg,transparent,var(--neutral-6),transparent)]" />
        <FlowNode
          ref={fromRef}
          icon={<LogoGithub className="size-4" />}
          title="GitHub"
          description="PR opened"
        />
        <FlowNode
          ref={centerRef}
          icon={<Workflow className="size-4 text-[var(--brand-primary)]" />}
          title="Nebutra"
          description="Policy run"
        />
        <FlowNode
          ref={toRef}
          icon={<LogoSlack className="size-4" />}
          title="Slack"
          description="Alert sent"
        />
        <AnimatedBeam containerRef={containerRef} fromRef={fromRef} toRef={centerRef} />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={centerRef}
          toRef={toRef}
          tone="success"
          intensity="subtle"
          curvature={28}
          delay={0.8}
        />
      </div>
    </FlowSurface>
  );
}

export const ProductFlow: Story = {
  render: () => <ProductFlowDemo />,
};

export const DenseTopology: Story = {
  render: () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const webhookRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<HTMLDivElement>(null);
    const dbRef = useRef<HTMLDivElement>(null);
    const serverRef = useRef<HTMLDivElement>(null);

    return (
      <FlowSurface>
        <div ref={containerRef} className="relative grid min-h-[196px] grid-cols-3 gap-8">
          <div className="flex flex-col justify-between">
            <FlowNode
              ref={webhookRef}
              icon={<Workflow className="size-4" />}
              title="Webhook"
              description="ingest"
            />
            <FlowNode
              ref={serverRef}
              icon={<Servers className="size-4" />}
              title="Runtime"
              description="edge"
            />
          </div>
          <div className="flex items-center justify-center">
            <FlowNode
              ref={workerRef}
              icon={<Workflow className="size-4 text-[var(--brand-primary)]" />}
              title="Worker"
              description="normalize"
            />
          </div>
          <div className="flex items-center justify-end">
            <FlowNode
              ref={dbRef}
              icon={<Database className="size-4" />}
              title="Database"
              description="persist"
            />
          </div>
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={webhookRef}
            toRef={workerRef}
            tone="brand"
            curvature={18}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={serverRef}
            toRef={workerRef}
            tone="neutral"
            intensity="subtle"
            curvature={-18}
            delay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={workerRef}
            toRef={dbRef}
            tone="success"
            intensity="normal"
            delay={0.7}
          />
        </div>
      </FlowSurface>
    );
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark">
      <ProductFlowDemo />
    </div>
  ),
};
