import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { useState } from "react";

const meta: Meta = {
  title: "Design Tokens/Motion",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Four-rail motion duration scale. Names denote **intent**, not relative speed. " +
          "`micro` (100ms) for momentary feedback, `flow` (200ms) for state transitions, " +
          "`reveal` (300ms) for content unveils, `cinematic` (500ms) for hero-grade entrances. " +
          "Use `<AnimateIn>` for entrance presets. SSOT: `@nebutra/design-tokens` core.json → `duration.*`.",
      },
    },
  },
};
export default meta;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-24 w-48 items-center justify-center rounded-[var(--radius-card)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] text-sm font-medium text-[var(--neutral-12)] shadow-sm">
      {children}
    </div>
  );
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 rounded-md bg-[var(--neutral-3)] px-4 py-2 text-sm font-medium text-[var(--neutral-11)] hover:bg-[var(--neutral-4)]"
    >
      Replay ↺
    </button>
  );
}

function AllPresetsDemo() {
  const [key, setKey] = useState(0);

  return (
    <div className="bg-[var(--neutral-2)] p-8">
      <div className="flex flex-wrap gap-6">
        {(["emerge", "flow", "fade", "fadeUp", "scale"] as const).map((preset, i) => (
          <div key={`${preset}-${key}`} className="flex flex-col items-center gap-2">
            <AnimateIn preset={preset} delay={i * 0.1}>
              <Card>{preset}</Card>
            </AnimateIn>
            <span className="font-mono text-xs text-[var(--neutral-9)]">{preset}</span>
          </div>
        ))}
      </div>
      <ReplayButton onClick={() => setKey((k) => k + 1)} />
    </div>
  );
}

export const AllPresets: StoryObj = {
  name: "AnimateIn — Presets",
  render: () => <AllPresetsDemo />,
};

function StaggerDemo() {
  const [key, setKey] = useState(0);

  return (
    <div className="bg-[var(--neutral-2)] p-8">
      <AnimateInGroup key={key} stagger="normal" className="flex gap-4">
        {["One", "Two", "Three", "Four", "Five"].map((label) => (
          <AnimateIn key={label} preset="fadeUp">
            <Card>{label}</Card>
          </AnimateIn>
        ))}
      </AnimateInGroup>
      <ReplayButton onClick={() => setKey((k) => k + 1)} />
    </div>
  );
}

export const Stagger: StoryObj = {
  name: "AnimateInGroup — Stagger",
  render: () => <StaggerDemo />,
};

const RAILS = [
  {
    name: "micro",
    ms: 100,
    token: "--duration-micro",
    tw: "duration-micro",
    intent: "Micro-feedback",
    examples: "hover, focus, toggle, button press",
  },
  {
    name: "flow",
    ms: 200,
    token: "--duration-flow",
    tw: "duration-flow",
    intent: "State flow (default)",
    examples: "modal open, dropdown reveal, tab switch, page transition",
  },
  {
    name: "reveal",
    ms: 300,
    token: "--duration-reveal",
    tw: "duration-reveal",
    intent: "Content unveil",
    examples: "slide-in, expand, accordion, drawer",
  },
  {
    name: "cinematic",
    ms: 500,
    token: "--duration-cinematic",
    tw: "duration-cinematic",
    intent: "Hero entrance",
    examples: "landing reveal, large delight moments",
  },
] as const;

export const DurationScale: StoryObj = {
  name: "Duration Scale (4 rails)",
  parameters: {
    docs: {
      description: {
        story:
          "The canonical four-rail motion duration scale. Bar width is proportional to duration. " +
          "Names denote intent; choose by *what* you're animating, not *how fast*.",
      },
    },
  },
  render: () => (
    <div className="space-y-6 bg-[var(--neutral-1)] p-8">
      {RAILS.map(({ name, ms, token, tw, intent, examples }) => (
        <div
          key={name}
          className="grid grid-cols-[140px_1fr_auto] items-center gap-6 border-b border-[var(--neutral-6)] pb-4 last:border-b-0"
        >
          <div>
            <div className="font-mono text-sm font-medium text-[var(--neutral-12)]">{name}</div>
            <div className="font-mono text-xs text-[var(--neutral-9)]">{ms}ms</div>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--neutral-3)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(ms / 500) * 100}%`,
                background: "var(--brand-gradient)",
              }}
            />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-[var(--neutral-12)]">{intent}</div>
            <div className="text-xs text-[var(--neutral-10)]">{examples}</div>
          </div>
          <div className="col-span-3 -mt-2 grid grid-cols-2 gap-4 font-mono text-[10px] text-[var(--neutral-9)]">
            <span>
              CSS var: <code className="text-[var(--neutral-11)]">{token}</code>
            </span>
            <span>
              Tailwind: <code className="text-[var(--neutral-11)]">{tw}</code>
            </span>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const IntentMapping: StoryObj = {
  name: "Intent Mapping (when to use which)",
  parameters: {
    docs: {
      description: {
        story:
          "Decision matrix — pick a rail by interaction intent. If you're tempted to type a raw ms value, " +
          "this table tells you which rail you actually want.",
      },
    },
  },
  render: () => {
    const rows: Array<{
      scenario: string;
      rail: (typeof RAILS)[number]["name"];
      rationale: string;
    }> = [
      {
        scenario: "Button hover scale",
        rail: "micro",
        rationale: "Pointer feedback should be ≤150ms",
      },
      { scenario: "Toggle / switch flip", rail: "micro", rationale: "Discrete state change" },
      { scenario: "Focus ring fade-in", rail: "micro", rationale: "Should never lag perception" },
      {
        scenario: "Dropdown menu open",
        rail: "flow",
        rationale: "Considered, not snappy; 200ms feels deliberate",
      },
      { scenario: "Modal/Dialog mount", rail: "flow", rationale: "Default state-flow rail" },
      {
        scenario: "Tab content swap",
        rail: "flow",
        rationale: "Cross-fade between two stable states",
      },
      {
        scenario: "Accordion expand",
        rail: "reveal",
        rationale: "Height/auto change reads better at 300ms",
      },
      {
        scenario: "Drawer slide-in from edge",
        rail: "reveal",
        rationale: "Travel distance ⟶ longer than flow",
      },
      {
        scenario: "Toast/banner mount",
        rail: "reveal",
        rationale: "Catch attention without being slow",
      },
      {
        scenario: "Landing hero first paint",
        rail: "cinematic",
        rationale: "Sets brand tone; user expects entrance",
      },
      {
        scenario: "Marketing section scroll reveal",
        rail: "cinematic",
        rationale: "Storytelling moment",
      },
      {
        scenario: "Feature card grid stagger",
        rail: "cinematic",
        rationale: "Group reveal benefits from longer rail",
      },
    ];

    return (
      <div className="bg-[var(--neutral-1)] p-8">
        <table className="w-full max-w-[1400px] text-left text-sm">
          <thead className="border-b border-[var(--neutral-7)] text-xs uppercase tracking-wider text-[var(--neutral-10)]">
            <tr>
              <th className="px-3 py-2 font-medium">Scenario</th>
              <th className="px-3 py-2 font-medium">Rail</th>
              <th className="px-3 py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.scenario} className="border-b border-[var(--neutral-6)] last:border-b-0">
                <td className="p-3 text-[var(--neutral-12)]">{r.scenario}</td>
                <td className="p-3">
                  <code className="rounded bg-[var(--neutral-3)] px-2 py-0.5 font-mono text-xs text-[var(--neutral-12)]">
                    {r.rail}
                  </code>
                </td>
                <td className="p-3 text-[var(--neutral-10)]">{r.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
};

export const ReducedMotion: StoryObj = {
  name: "Reduced Motion (a11y)",
  parameters: {
    docs: {
      description: {
        story:
          "`<AnimateIn>` automatically honors `prefers-reduced-motion`. Toggle your OS setting and replay — " +
          "transforms/blur are dropped; only opacity fades remain.",
      },
    },
  },
  render: () => <ReducedMotionDemo />,
};

function ReducedMotionDemo() {
  const [key, setKey] = useState(0);

  return (
    <div className="bg-[var(--neutral-2)] p-8">
      <div className="flex flex-wrap gap-6">
        {(["emerge", "flow", "fadeUp"] as const).map((preset, i) => (
          <AnimateIn key={`${preset}-${key}`} preset={preset} delay={i * 0.1}>
            <Card>{preset}</Card>
          </AnimateIn>
        ))}
      </div>
      <ReplayButton onClick={() => setKey((k) => k + 1)} />
    </div>
  );
}
