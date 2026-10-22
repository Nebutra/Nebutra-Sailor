"use client";

import { ShowcaseDemo } from "@/components/showcase-demo";

/**
 * Every live demo at 1:1 in a 560px column, one under the other, each tagged
 * with its id. `scripts/measure-showcase.mjs` reads the painted size of each and
 * writes `showcase-sizes.generated.json`, which bands the cards.
 *
 * 560px is the width the old fit-stage laid demos out at: a narrow article
 * column, which is what they were written for.
 */
export function ShowcaseProbe({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {ids.map((id) => (
        <div data-probe={id} key={id} style={{ width: 560 }}>
          <ShowcaseDemo eager id={id} />
        </div>
      ))}
    </div>
  );
}
