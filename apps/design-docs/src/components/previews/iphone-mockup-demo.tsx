import { IphoneMockup } from "@nebutra/ui/primitives";

// Portrait gradient (9:16) — avoids network dependency.
const DEMO_SCREEN =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230033fe'/%3E%3Cstop offset='1' stop-color='%230bf1c3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='1600' fill='url(%23g)'/%3E%3Ctext x='450' y='820' text-anchor='middle' fill='white' font-size='64' font-weight='700' font-family='system-ui' opacity='0.85'%3ENebutra%3C/text%3E%3C/svg%3E";

export function IphoneMockupDemo() {
  return (
    <div className="mx-auto w-full max-w-xs px-4 py-8">
      <IphoneMockup className="w-full" src={DEMO_SCREEN} />
    </div>
  );
}
