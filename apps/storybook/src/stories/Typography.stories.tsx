import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Design Tokens/Typography",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "All text styles and the type scale. Use semantic class names (`text-heading-32`, `text-label-16-strong`) not raw `text-2xl`.",
      },
    },
  },
};
export default meta;

const typeScale = [
  {
    name: "display-1 / Hero",
    classes: "text-5xl md:text-7xl font-bold leading-tight",
    sample: "The future of SaaS",
  },
  {
    name: "display-2",
    classes: "text-4xl md:text-5xl font-bold leading-tight",
    sample: "Build faster, deploy smarter",
  },
  { name: "heading-1", classes: "text-3xl font-bold leading-tight", sample: "Dashboard Overview" },
  { name: "heading-2", classes: "text-2xl font-semibold leading-snug", sample: "Recent Activity" },
  { name: "heading-3", classes: "text-xl font-semibold leading-snug", sample: "Team Members" },
  { name: "heading-4", classes: "text-lg font-semibold", sample: "Billing Settings" },
  {
    name: "body-lg",
    classes: "text-lg leading-relaxed",
    sample: "Configure your integration with full API access and webhook support.",
  },
  {
    name: "body",
    classes: "text-base leading-relaxed",
    sample: "All events are logged and available in real-time for debugging.",
  },
  {
    name: "body-sm",
    classes: "text-sm leading-normal",
    sample: "Last updated 3 minutes ago via webhook",
  },
  { name: "caption / label", classes: "text-xs font-medium", sample: "ACTIVE · 2.4k events today" },
];

export const TypeScale: StoryObj = {
  name: "Type Scale",
  render: () => (
    <div className="space-y-6 bg-[hsl(var(--background))] p-8">
      {typeScale.map(({ name, classes, sample }) => (
        <div key={name} className="border-b border-[hsl(var(--border))] pb-4">
          <div className="mb-1 flex items-baseline gap-3">
            <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{name}</span>
            <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
              {classes}
            </span>
          </div>
          <p className={`${classes} text-[hsl(var(--foreground))]`}>{sample}</p>
        </div>
      ))}
    </div>
  ),
};

export const FontFamilies: StoryObj = {
  name: "Font Families",
  render: () => (
    <div className="space-y-6 bg-[hsl(var(--background))] p-8">
      <div>
        <p className="mb-1 font-mono text-xs text-[hsl(var(--muted-foreground))]">
          --font-sans / var(--font-sans)
        </p>
        <p
          className="text-3xl text-[hsl(var(--foreground))]"
          style={{ fontFamily: "var(--font-sans, sans-serif)" }}
        >
          The quick brown fox jumps over the lazy dog
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Geist Sans → Noto Sans SC → system-ui
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs text-[hsl(var(--muted-foreground))]">
          --font-mono / font-mono
        </p>
        <p className="font-mono text-2xl text-[hsl(var(--foreground))]">
          const deploy = () =&gt; ship()
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Geist Mono → Fira Code → monospace
        </p>
      </div>
    </div>
  ),
};

export const BrandEmphasisText: StoryObj = {
  name: "Brand Emphasis Text",
  render: () => (
    <div className="space-y-4 bg-[hsl(var(--background))] p-8">
      <p className="text-5xl font-bold text-[hsl(var(--primary))]">云毓智能</p>
      <p className="text-3xl font-semibold text-[var(--brand-accent)]">Nebutra AI Platform</p>
      <pre className="rounded bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--muted-foreground))]">{`className="text-[hsl(var(--primary))]"`}</pre>
    </div>
  ),
};
