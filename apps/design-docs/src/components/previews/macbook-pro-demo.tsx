"use client";

import { MacbookPro } from "@nebutra/ui/primitives";

// Local SVG data URL — avoids network dependency, Fake-IP DNS proxy quirks,
// and Next.js SSRF protection on remote optimizer fetches.
const DEMO_SCREEN =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230033fe'/%3E%3Cstop offset='1' stop-color='%230bf1c3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Ctext x='800' y='480' text-anchor='middle' fill='white' font-size='64' font-weight='700' font-family='system-ui' opacity='0.85'%3ENebutra%3C/text%3E%3C/svg%3E";

export function MacbookProDemo() {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl items-center justify-center p-8">
      <MacbookPro src={DEMO_SCREEN} className="h-auto w-full" />
    </div>
  );
}
