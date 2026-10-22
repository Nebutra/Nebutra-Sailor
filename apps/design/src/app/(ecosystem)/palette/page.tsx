import type { Metadata } from "next";
import { PaletteStudio } from "@/components/palette-studio";
import { oklchToHex } from "@/lib/color";
import { scales } from "@/lib/tokens";
import { Mono, PageHeader } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Palette — ecosystem",
  description:
    "An OKLCH palette generator: one seed colour becomes a 12-step light and dark ladder, with WCAG 2 and APCA contrast measured on every pairing and CSS or DTCG export.",
};

/**
 * The seed the page opens on is the system's own solid blue — read from the
 * resolved `blue` scale, step 9, rather than typed here. If the brand colour
 * moves, the generator opens on the new one.
 */
function brandSeed(): string {
  const blue = scales("light").find((scale) => scale.name === "blue");
  const solid = blue?.steps.find((step) => step.token.name.endsWith(".9"));
  // If the scale ever goes missing the generator still opens, on a neutral mid-grey.
  return solid?.hex ?? oklchToHex({ l: 0.6, c: 0, h: 0 });
}

export default function PalettePage() {
  const seed = brandSeed();

  return (
    <div>
      <PageHeader eyebrow="ecosystem / palette" title="Palette">
        <p>
          One colour in, a 12-step ladder out — light and dark, in OKLCH, with the same step
          meanings as <Mono>--blue-1…12</Mono>. Every pairing the ladder is meant for is measured
          with WCAG 2 and APCA, and a miss is marked, not smoothed over.
        </p>
      </PageHeader>
      <PaletteStudio defaultSeed={seed} />
    </div>
  );
}
