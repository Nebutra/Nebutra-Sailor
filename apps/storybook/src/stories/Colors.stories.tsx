import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Design Tokens/Colors",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "All brand and semantic colors. Override `--nebutra-blue-*` and `--nebutra-cyan-*` CSS variables in your `globals.css` to rebrand.",
      },
    },
  },
};
export default meta;

// ── helpers ──────────────────────────────────────────────────

const legacySteps = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-12 w-full rounded-md border border-[var(--neutral-7)]"
        style={{ background: `var(${cssVar})` }}
      />
      <p className="text-xs font-medium text-[var(--neutral-12)]">{name}</p>
      <p className="font-mono text-[11px] text-[var(--neutral-10)]">{cssVar}</p>
    </div>
  );
}

function ColorRow({
  label,
  swatches,
}: {
  label: string;
  swatches: Array<{ name: string; cssVar: string }>;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-semibold text-[var(--neutral-11)]">{label}</h3>
      <div className="grid grid-cols-6 gap-3 md:grid-cols-11">
        {swatches.map((s) => (
          <Swatch key={s.cssVar} {...s} />
        ))}
      </div>
    </div>
  );
}

// ── story ─────────────────────────────────────────────────────

export const BrandColors: StoryObj = {
  name: "Brand Scales",
  render: () => (
    <div className="bg-[var(--neutral-1)] p-6">
      <ColorRow
        label="云毓蓝 — Primary Brand (--nebutra-blue-*)"
        swatches={legacySteps.map((name) => ({ name, cssVar: `--nebutra-blue-${name}` }))}
      />
      <ColorRow
        label="云毓青 — Secondary Accent (--nebutra-cyan-*)"
        swatches={legacySteps.map((name) => ({ name, cssVar: `--nebutra-cyan-${name}` }))}
      />
    </div>
  ),
};

export const SemanticColors: StoryObj = {
  name: "Semantic Scale (12-step)",
  render: () => (
    <div className="bg-[var(--neutral-1)] p-6">
      <p className="mb-4 text-sm text-[var(--neutral-10)]">
        Geist-style 12-step scales. Steps 1–2 = backgrounds, 3–5 = component states, 6–8 = borders,
        9–10 = solid fills, 11–12 = text.
      </p>
      {(["blue", "cyan", "neutral"] as const).map((color) => (
        <ColorRow
          key={color}
          label={`--${color}-1 → --${color}-12`}
          swatches={Array.from({ length: 12 }, (_, i) => ({
            name: String(i + 1),
            cssVar: `--${color}-${i + 1}`,
          }))}
        />
      ))}
    </div>
  ),
};

export const Gradients: StoryObj = {
  name: "Brand Gradients",
  render: () => (
    <div className="grid grid-cols-2 gap-4 bg-[var(--neutral-1)] p-6 md:grid-cols-4">
      {[
        { name: "Default", cssVar: "--brand-gradient" },
        { name: "Reverse", cssVar: "--brand-gradient-reverse" },
        { name: "Vertical", cssVar: "--brand-gradient-vertical" },
        { name: "Radial", cssVar: "--brand-gradient-radial" },
      ].map(({ name, cssVar }) => (
        <div key={cssVar} className="flex flex-col gap-2">
          <div className="h-24 rounded-lg" style={{ background: `var(${cssVar})` }} />
          <p className="text-sm font-medium text-[var(--neutral-12)]">{name}</p>
          <p className="font-mono text-[11px] text-[var(--neutral-10)]">{cssVar}</p>
        </div>
      ))}
    </div>
  ),
};

export const DarkMode: StoryObj = {
  name: "Dark Mode Preview",
  parameters: { backgrounds: { default: "dark" } },
  render: () => (
    <div className="dark p-6 bg-[var(--neutral-1)] min-h-64">
      <p className="mb-4 text-sm" style={{ color: "var(--neutral-11)" }}>
        All semantic tokens switch automatically in dark mode.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {[
          "--neutral-1",
          "--neutral-2",
          "--neutral-3",
          "--neutral-4",
          "--neutral-9",
          "--neutral-10",
          "--neutral-11",
          "--neutral-12",
          "--blue-9",
          "--blue-3",
          "--cyan-9",
          "--cyan-3",
        ].map((cssVar) => (
          <div key={cssVar} className="flex flex-col gap-1">
            <div
              className="h-10 w-full rounded border border-[color:var(--neutral-7)]"
              style={{ background: `var(${cssVar})` }}
            />
            <p className="font-mono text-[10px] text-[color:var(--neutral-5)]">{cssVar}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};
