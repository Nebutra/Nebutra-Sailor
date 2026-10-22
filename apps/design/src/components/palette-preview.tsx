// @primitive-exempt: a miniature UI painted entirely in the generated palette; the primitives would paint it in the site theme.
import { type Step, solidInk } from "@/lib/color";

/**
 * The generated ladder, used the way the roles say to use it. Every colour is a
 * `--p-N` custom property set from the steps, so the hover and focus states are
 * ordinary CSS: steps 3 → 4 → 5 for a soft control, 9 → 10 for a solid one, and
 * `color-mix()` for the focus ring and the tinted callout, where a step would be
 * too opaque.
 */
export function PalettePreview({ steps }: { steps: readonly Step[] }) {
  const vars: Record<string, string> = { "--p-ink": solidInk(steps) };
  for (const step of steps) vars[`--p-${step.step}`] = step.hex;

  return (
    <div
      className="flex flex-col gap-5 rounded-lg border p-5"
      style={{ ...vars, backgroundColor: "var(--p-1)", borderColor: "var(--p-6)" }}
    >
      <div className="flex flex-col gap-1.5">
        <p
          className="m-0 font-medium text-xs uppercase tracking-wider"
          style={{ color: "var(--p-11)" }}
        >
          Release notes
        </p>
        <p className="m-0 font-medium text-lg" style={{ color: "var(--p-12)" }}>
          Tokens ship with the palette
        </p>
        <p className="m-0 text-sm" style={{ color: "var(--p-11)" }}>
          Body copy sits on step 11 over step 1; the heading takes step 12.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md px-3.5 py-2 font-medium text-sm transition-colors hover:bg-[var(--p-10)] focus-visible:outline-[color:var(--p-9)]"
          style={{ backgroundColor: "var(--p-9)", color: "var(--p-ink)" }}
          type="button"
        >
          Solid
        </button>
        <button
          className="rounded-md px-3.5 py-2 font-medium text-sm transition-colors hover:bg-[var(--p-4)] active:bg-[var(--p-5)] focus-visible:outline-[color:var(--p-9)]"
          style={{ backgroundColor: "var(--p-3)", color: "var(--p-11)" }}
          type="button"
        >
          Soft
        </button>
        <button
          className="rounded-md border px-3.5 py-2 font-medium text-sm transition-colors hover:border-[var(--p-8)] focus-visible:outline-[color:var(--p-9)]"
          style={{ borderColor: "var(--p-7)", color: "var(--p-11)" }}
          type="button"
        >
          Outline
        </button>
      </div>

      <input
        data-allow-native
        aria-label="Sample input"
        className="rounded-md border bg-transparent px-3 py-2 text-sm placeholder:opacity-70 hover:border-[var(--p-8)] focus-visible:border-[var(--p-9)] focus-visible:outline-[color:var(--p-9)]"
        placeholder="Focus me for the ring"
        style={{ borderColor: "var(--p-7)", color: "var(--p-12)" }}
        type="text"
      />

      <p
        className="m-0 rounded-md border px-3 py-2.5 text-sm"
        style={{
          color: "var(--p-11)",
          borderColor: "color-mix(in oklch, var(--p-9) 28%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--p-9) 10%, var(--p-1))",
        }}
      >
        A callout tinted with <code className="font-mono">color-mix()</code> — 10% of the solid over
        the canvas.
      </p>
    </div>
  );
}
