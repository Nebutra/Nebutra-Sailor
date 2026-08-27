import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Design Tokens/Shadows",
  tags: ["autodocs"],
};
export default meta;

export const ElevationScale: StoryObj = {
  name: "Elevation Scale",
  render: () => (
    <div className="grid grid-cols-3 gap-6 bg-[hsl(var(--muted))] p-8 md:grid-cols-6">
      {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-3">
          <div
            className="h-20 w-full rounded-lg bg-[hsl(var(--background))]"
            style={{ boxShadow: `var(--elevation-${size})` }}
          />
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            --elevation-{size}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const BrandShadows: StoryObj = {
  name: "Brand Shadows",
  render: () => (
    <div className="grid grid-cols-2 gap-8 bg-[hsl(var(--foreground))] p-8">
      {[
        { name: "--elevation-brand", label: "Brand glow (small)" },
        { name: "--elevation-brand-lg", label: "Brand glow (large)" },
      ].map(({ name, label }) => (
        <div key={name} className="flex flex-col items-center gap-3">
          <div
            className="h-24 w-full rounded-lg bg-[hsl(var(--primary))]"
            style={{ boxShadow: `var(${name})` }}
          />
          <span className="font-mono text-xs text-[color:hsl(var(--border))]">{name}</span>
          <span className="text-[color:hsl(var(--border))] text-xs">{label}</span>
        </div>
      ))}
    </div>
  ),
};
