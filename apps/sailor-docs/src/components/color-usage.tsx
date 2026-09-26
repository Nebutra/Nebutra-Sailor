"use client";

import { ComponentPreview } from "./component-preview";

function UsageRow({
  colorName,
  swatch,
  description,
}: {
  colorName: string;
  swatch: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5 text-sm border-b border-border last:border-0">
      <div className="flex items-center gap-4 w-48 font-mono">
        <div
          className="h-4 w-4 rounded-full border border-foreground/10 shadow-sm"
          style={{ backgroundColor: swatch }}
        />
        {colorName}
      </div>
      <div className="text-muted-foreground">{description}</div>
    </div>
  );
}

export function ColorUsageDemos() {
  return (
    <div className="mt-16 flex flex-col gap-16">
      {/* Backgrounds */}
      <section>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">Backgrounds</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          There are two primary background colors for pages and UI components. Background 1 is the
          default for surfaces. Background 2 is used sparingly for subtle differentiation when
          elements need to stand out from the canvas.
        </p>
        <div className="mb-8 border border-border rounded-xl px-4 bg-card">
          <UsageRow
            colorName="Background 1"
            swatch="hsl(var(--background))"
            description="Default element and page background"
          />
          <UsageRow
            colorName="Background 2"
            swatch="hsl(var(--muted))"
            description="Secondary background for subtle contrast"
          />
        </div>
        <ComponentPreview className="bg-muted gap-10 py-16">
          <div className="h-40 w-40 rounded-2xl bg-background shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center text-sm font-medium text-muted-foreground font-mono">
            1 (Default)
          </div>
          <div className="h-40 w-40 rounded-2xl bg-muted border border-border flex items-center justify-center text-sm font-medium text-muted-foreground font-mono">
            2 (Subtle)
          </div>
        </ComponentPreview>
      </section>

      {/* Component Backgrounds */}
      <section>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">
          Colors 50-200: Component Backgrounds
        </h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          These colors are designed for subtle UI component backgrounds, like badges, active states,
          and soft semantic alerts. They provide color context without overwhelming the foreground
          content.
        </p>
        <div className="mb-8 border border-border rounded-xl px-4 bg-card">
          <UsageRow
            colorName="blue-50"
            swatch="var(--nebutra-blue-50)"
            description="Default soft background"
          />
          <UsageRow
            colorName="blue-100"
            swatch="var(--nebutra-blue-100)"
            description="Hover soft background"
          />
          <UsageRow
            colorName="blue-200"
            swatch="var(--nebutra-blue-200)"
            description="Active soft background"
          />
        </div>
        <ComponentPreview className="py-20">
          <div className="flex gap-6">
            <div className="inline-flex items-center rounded-full bg-[var(--nebutra-blue-50)] px-3 py-1 text-xs font-semibold text-[var(--nebutra-blue-700)] transition-colors hover:bg-[var(--nebutra-blue-100)] cursor-pointer">
              Default Badge (50)
            </div>
            <div className="inline-flex items-center rounded-full bg-[var(--nebutra-blue-100)] px-3 py-1 text-xs font-semibold text-[var(--nebutra-blue-800)] cursor-pointer">
              Hover Badge (100)
            </div>
            <div className="inline-flex items-center rounded-full bg-[var(--nebutra-blue-200)] px-3 py-1 text-xs font-semibold text-[var(--nebutra-blue-900)] cursor-pointer">
              Active Badge (200)
            </div>
          </div>
        </ComponentPreview>
      </section>

      {/* Borders */}
      <section>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">Colors 300-400: Borders</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          These mid-tone colors are specifically tuned for UI component borders, dividers, and focus
          rings. They provide crisp definition against both dark and light backgrounds.
        </p>
        <div className="mb-8 border border-border rounded-xl px-4 bg-card">
          <UsageRow
            colorName="blue-300"
            swatch="var(--nebutra-blue-300)"
            description="Default UI border"
          />
          <UsageRow
            colorName="blue-400"
            swatch="var(--nebutra-blue-400)"
            description="Hover UI border / Focus ring"
          />
        </div>
        <ComponentPreview className="py-20">
          <div className="flex gap-6">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ring-offset-background border-2 border-[var(--nebutra-blue-300)] text-[var(--nebutra-blue-700)] hover:bg-[var(--nebutra-blue-50)] hover:border-[var(--nebutra-blue-400)] h-10 py-2 px-6"
            >
              Outlined Action
            </button>
          </div>
        </ComponentPreview>
      </section>

      {/* High Contrast Backgrounds */}
      <section>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">
          Colors 500-600: High Contrast Backgrounds
        </h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          These are the brand's primary action colors. They are designed for solid, high-contrast
          backgrounds like primary buttons, accent banners, and progress bars.
        </p>
        <div className="mb-8 border border-border rounded-xl px-4 bg-card">
          <UsageRow
            colorName="blue-500"
            swatch="hsl(var(--primary))"
            description="High contrast background (Brand Primary)"
          />
          <UsageRow
            colorName="blue-600"
            swatch="var(--nebutra-blue-600)"
            description="Hover high contrast background"
          />
        </div>
        <ComponentPreview className="py-20">
          <div className="flex gap-6">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium shadow transition-colors disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-6"
            >
              Primary Button
            </button>
          </div>
        </ComponentPreview>
      </section>

      {/* Text and Icons */}
      <section>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">
          Colors 700-950: Text and Icons
        </h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          The darkest colors in the scale are reserved for typography and icons to ensure maximum
          WCAG accessibility and legibility against light backgrounds.
        </p>
        <div className="mb-8 border border-border rounded-xl px-4 bg-card">
          <UsageRow
            colorName="blue-700"
            swatch="var(--nebutra-blue-700)"
            description="Secondary text and bold icons"
          />
          <UsageRow
            colorName="blue-900"
            swatch="var(--nebutra-blue-900)"
            description="Primary text and heading"
          />
        </div>
        <ComponentPreview className="py-20 flex-col gap-6">
          {/* allow-palette: this card demonstrates the 700-950 scale specifically against a light background (the section's own claim), not the site's own surface */}
          <div className="flex flex-col gap-4 max-w-md w-full p-8 border border-black/5 rounded-2xl bg-white shadow-sm">
            <h4 className="text-2xl font-bold tracking-tight text-[var(--nebutra-blue-900)]">
              Data Aggregation
            </h4>
            <p className="text-[var(--nebutra-blue-700)] leading-relaxed">
              Connect and manage all your external data sources seamlessly with Nebutra's
              enterprise-grade integration engine.
            </p>
            <div className="mt-4 flex gap-3 text-primary">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="16.5" y1="12" y2="12" />
              </svg>
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
          </div>
        </ComponentPreview>
      </section>
    </div>
  );
}
