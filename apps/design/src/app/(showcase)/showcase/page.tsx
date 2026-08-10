import type { Metadata } from "next";
import { ShowcaseDemo } from "@/components/showcase-demo";
import { showcaseDemos } from "@/lib/showcase";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Showcase — ${SITE_NAME}`,
  description:
    "The expressive half of the library — backgrounds, shaders, device mockups, text effects and motion pieces — rendered live from @nebutra/docs-shared.",
};

/**
 * The half of the library that only design-docs ever showed.
 *
 * This site documented the controls — button, input, table — and none of the
 * expressive surface: the globes, shaders, aurora text, confetti, device
 * mockups and animated backgrounds that make a landing page. All of it lives in
 * `@nebutra/docs-shared` and was reachable only through the app being retired,
 * so retiring that app would have taken it with it.
 *
 * The list is the directory, not a registry — see `lib/showcase.ts`. Demos whose
 * name matches a component that already has a page are filtered out, so this
 * section is exactly what the rest of the site does not cover.
 */
/** Width every demo renders at before being scaled into its card — roughly the
 *  article column these were written for. */
const STAGE_WIDTH = 880;

/** What makes an 880px stage read inside a 210px-tall card: small, but legible
 *  rather than merely shrunk. */
const STAGE_SCALE = 0.4;

export default function ShowcasePage() {
  const demos = showcaseDemos();

  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">Showcase</h1>
        <p className="text-muted-foreground">
          The expressive half of the library — backgrounds, shaders, device mockups, text effects,
          charts and motion pieces. Every card below is a real demo from{" "}
          <code className="font-mono text-sm">@nebutra/docs-shared</code>, rendered live.
        </p>
        <p className="text-muted-foreground text-sm">
          The list is read from the package directory at build time and filtered against the
          components that already have their own page, so it is precisely what this site did not
          previously show. <strong className="font-medium text-foreground">{demos.length}</strong>{" "}
          demos.
        </p>
      </header>

      {demos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No demos found. <code className="font-mono text-xs">@nebutra/docs-shared</code> is not
          resolvable from this build.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {demos.map((demo) => (
            <li
              className="flex flex-col overflow-hidden rounded-xl bg-muted/40 shadow-ambient-sm"
              key={demo.id}
            >
              {/* Demos size themselves very differently — a globe wants room, a
                  badge wants none. The card gives every one the same frame and
                  clips what overflows, so the grid stays a grid. */}
              {/* A fixed stage, scaled down — not a small box with the overflow
                  clipped. These demos are written for an article column, so
                  dropping them into a 330px card and hiding what spills gave
                  fragments: a feature grid cut mid-tile, a menubar with its
                  dropdown sliced off, body copy squeezed into a one-character
                  column. Every one read as broken, and the few that genuinely
                  were became impossible to pick out.

                  Rendering at the width they were designed for and scaling the
                  result is what a thumbnail is: nothing is cropped, the demo
                  never learns it is small, and the cards share a shape. */}
              <div className="relative h-[210px] overflow-hidden bg-card">
                <div
                  className="pointer-events-none absolute top-0 left-1/2 origin-top p-6"
                  style={{
                    width: STAGE_WIDTH,
                    marginLeft: -STAGE_WIDTH / 2,
                    transform: `scale(${STAGE_SCALE})`,
                  }}
                >
                  <ShowcaseDemo id={demo.id} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2 p-4">
                <span className="font-medium text-foreground text-sm">{demo.label}</span>
                <code className="font-mono text-[10px] text-muted-foreground">{demo.id}</code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
