import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Design Tokens/Shadows",
  tags: ["autodocs"],
};
export default meta;

export const ElevationScale: StoryObj = {
  name: "Elevation Scale",
  render: () => (
    <div className="grid grid-cols-3 gap-6 bg-[var(--neutral-2)] p-8 md:grid-cols-6">
      {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-3">
          <div
            className="h-20 w-full rounded-lg bg-[var(--neutral-1)]"
            style={{ boxShadow: `var(--elevation-${size})` }}
          />
          <span className="font-mono text-xs text-[var(--neutral-10)]">--elevation-{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const BrandShadows: StoryObj = {
  name: "Brand Shadows",
  render: () => (
    <div className="grid grid-cols-2 gap-8 bg-[var(--neutral-12)] p-8">
      {[
        { name: "--elevation-brand", label: "Brand glow (small)" },
        { name: "--elevation-brand-lg", label: "Brand glow (large)" },
      ].map(({ name, label }) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div
            className="h-24 w-full rounded-lg bg-[var(--brand-primary)]"
            style={{ boxShadow: `var(${name})` }}
          />
          <span className="font-mono text-xs text-[color:var(--neutral-5)]">{name}</span>
          <span className="text-[color:var(--neutral-6)] text-xs">{label}</span>
        </div>
      ))}
    </div>
  ),
};
